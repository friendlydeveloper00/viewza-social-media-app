import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useCallback, useRef } from "react";

export interface ConversationWithDetails {
  id: string;
  updated_at: string;
  other_user: {
    user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
    is_encrypted: boolean;
  } | null;
  unread_count: number;
}

export interface MessageWithSender {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  is_encrypted: boolean;
  sender_profile: {
    username: string | null;
    avatar_url: string | null;
  };
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      if (!user) return [];

      const { data: participations, error: pErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (pErr) throw pErr;
      if (!participations?.length) return [];

      const convIds = participations.map((p) => p.conversation_id);

      const [convsRes, allParticipantsRes, messagesRes] = await Promise.all([
        supabase.from("conversations").select("*").in("id", convIds).order("updated_at", { ascending: false }),
        supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", convIds),
        supabase.from("messages").select("conversation_id, content, created_at, sender_id, read_at, is_encrypted").in("conversation_id", convIds).order("created_at", { ascending: false }),
      ]);

      const otherUserIds = new Set<string>();
      allParticipantsRes.data?.forEach((p) => {
        if (p.user_id !== user.id) otherUserIds.add(p.user_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", Array.from(otherUserIds));

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      const convOtherUser = new Map<string, string>();
      allParticipantsRes.data?.forEach((p) => {
        if (p.user_id !== user.id) convOtherUser.set(p.conversation_id, p.user_id);
      });

      const lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string; is_encrypted: boolean }>();
      const unreadMap = new Map<string, number>();

      messagesRes.data?.forEach((m) => {
        if (!lastMessageMap.has(m.conversation_id)) {
          lastMessageMap.set(m.conversation_id, { content: m.content, created_at: m.created_at, sender_id: m.sender_id, is_encrypted: m.is_encrypted });
        }
        if (m.sender_id !== user.id && !m.read_at) {
          unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
        }
      });

      return (convsRes.data || []).map((conv) => {
        const otherUserId = convOtherUser.get(conv.id) || "";
        const profile = profileMap.get(otherUserId);
        return {
          id: conv.id,
          updated_at: conv.updated_at,
          other_user: {
            user_id: otherUserId,
            username: profile?.username || null,
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
          },
          last_message: lastMessageMap.get(conv.id) || null,
          unread_count: unreadMap.get(conv.id) || 0,
        };
      });
    },
    enabled: !!user,
  });
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<MessageWithSender[]> => {
      if (!conversationId) return [];

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const senderIds = [...new Set(messages?.map((m) => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", senderIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return (messages || []).map((m) => ({
        id: m.id,
        content: m.content,
        sender_id: m.sender_id,
        created_at: m.created_at,
        read_at: m.read_at,
        is_encrypted: m.is_encrypted,
        sender_profile: profileMap.get(m.sender_id) || { username: null, avatar_url: null },
      }));
    },
    enabled: !!conversationId && !!user,
  });

  // Real-time subscription for inserts AND updates (read receipts)
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, isEncrypted = false }: { conversationId: string; content: string; isEncrypted?: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        is_encrypted: isEncrypted,
      });
      if (error) throw error;

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Mark messages as read
export function useMarkMessagesRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    async (conversationId: string) => {
      if (!user) return;
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    [user, queryClient]
  );
}

// Typing indicator via Realtime Presence
export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<number>(0);

  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typingUsers: string[] = [];
        for (const [userId, presences] of Object.entries(state)) {
          if (userId !== user.id) {
            const latest = presences[presences.length - 1] as { typing?: boolean };
            if (latest?.typing) typingUsers.push(userId);
          }
        }
        setOthersTyping(typingUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!channelRef.current) return;
      channelRef.current.track({ typing: isTyping });

      clearTimeout(typingTimeoutRef.current);
      if (isTyping) {
        typingTimeoutRef.current = window.setTimeout(() => {
          channelRef.current?.track({ typing: false });
        }, 3000);
      }
    },
    []
  );

  return { othersTyping, setTyping };
}

export function useStartConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      if (!user) throw new Error("Not authenticated");

      const { data: myParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myParticipations?.length) {
        const convIds = myParticipations.map((p) => p.conversation_id);
        const { data: otherParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", otherUserId)
          .in("conversation_id", convIds);

        if (otherParticipations?.length) {
          return otherParticipations[0].conversation_id;
        }
      }

      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({})
        .select("id")
        .single();
      if (convErr) throw convErr;

      const { error: pErr } = await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: otherUserId },
      ]);
      if (pErr) throw pErr;

      return conv.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
