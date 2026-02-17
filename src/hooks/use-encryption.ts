import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateKeyPair,
  storePrivateKey,
  getStoredPrivateKey,
  encryptMessage,
  decryptMessage,
} from "@/lib/crypto";

// Hook to manage user's encryption keys
export function useEncryptionKeys() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [privateKey, setPrivateKey] = useState<JsonWebKey | null>(null);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      let privKey = getStoredPrivateKey();

      if (privKey) {
        // Check if public key is in DB
        const { data } = await supabase
          .from("user_keys")
          .select("public_key")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setPrivateKey(privKey);
          setReady(true);
          return;
        }
      }

      // Generate new key pair
      const { publicKey, privateKeyJwk } = await generateKeyPair();
      storePrivateKey(privateKeyJwk);

      // Store public key in DB (upsert)
      await supabase.from("user_keys").upsert(
        { user_id: user.id, public_key: publicKey },
        { onConflict: "user_id" }
      );

      setPrivateKey(privateKeyJwk);
      setReady(true);
    };

    init();
  }, [user]);

  return { ready, privateKey };
}

// Hook to get another user's public key
export function useOtherPublicKey(otherUserId: string | null) {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!otherUserId) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("user_keys")
        .select("public_key")
        .eq("user_id", otherUserId)
        .single();

      setPublicKey(data?.public_key || null);
    };

    fetch();
  }, [otherUserId]);

  return publicKey;
}

// Encrypt a message for sending
export async function encryptForSend(
  content: string,
  privateKey: JsonWebKey,
  otherPublicKey: string
): Promise<string> {
  return encryptMessage(content, privateKey, otherPublicKey);
}

// Decrypt a received message
export async function decryptReceived(
  encrypted: string,
  privateKey: JsonWebKey,
  otherPublicKey: string
): Promise<string> {
  try {
    return await decryptMessage(encrypted, privateKey, otherPublicKey);
  } catch {
    return "[Unable to decrypt]";
  }
}
