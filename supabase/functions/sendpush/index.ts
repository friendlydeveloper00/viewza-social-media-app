import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return {
    publicKey: base64UrlEncode(publicRaw),
    privateKey: privateJwk.d!,
  };
}

async function getOrCreateVapidKeys(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data } = await supabaseAdmin
    .from("push_config")
    .select("*")
    .eq("id", "default")
    .single();

  if (data) {
    return {
      publicKey: data.vapid_public_key,
      privateKey: data.vapid_private_key,
      subject: data.vapid_subject,
    };
  }

  const keys = await generateVapidKeys();
  await supabaseAdmin.from("push_config").insert({
    id: "default",
    vapid_public_key: keys.publicKey,
    vapid_private_key: keys.privateKey,
  });

  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    subject: "mailto:hello@viewza.app",
  };
}

async function createJwt(
  privateKeyD: string,
  publicKeyRaw: string,
  audience: string,
  subject: string
) {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)).buffer);
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)).buffer);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pubBytes = base64UrlDecode(publicKeyRaw);
  const x = base64UrlEncode(pubBytes.slice(1, 33).buffer);
  const y = base64UrlEncode(pubBytes.slice(33, 65).buffer);

  const jwk = { kty: "EC", crv: "P-256", x, y, d: privateKeyD };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

const notificationMessages: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  message: "sent you a message",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // GET: Return VAPID public key
    if (req.method === "GET" && action === "vapid-key") {
      const vapid = await getOrCreateVapidKeys(supabaseAdmin);
      return new Response(
        JSON.stringify({ publicKey: vapid.publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Subscribe
    if (body.action === "subscribe") {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token!);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sub = body.subscription;
      await supabaseAdmin.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      }, { onConflict: "user_id,endpoint" });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unsubscribe
    if (body.action === "unsubscribe") {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token!);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("push_subscriptions").delete()
        .eq("user_id", user.id).eq("endpoint", body.endpoint);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send push (called from DB trigger)
    if (body.user_id && body.type && body.actor_id) {
      const { user_id, type, actor_id } = body;

      const { data: subscriptions } = await supabaseAdmin
        .from("push_subscriptions").select("*").eq("user_id", user_id);

      if (!subscriptions?.length) {
        return new Response(JSON.stringify({ ok: true, sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: actor } = await supabaseAdmin
        .from("profiles").select("username, display_name")
        .eq("user_id", actor_id).single();

      const actorName = actor?.display_name || actor?.username || "Someone";
      const message = notificationMessages[type] || "sent you a notification";
      const vapid = await getOrCreateVapidKeys(supabaseAdmin);

      let sent = 0;
      for (const sub of subscriptions) {
        try {
          const subUrl = new URL(sub.endpoint);
          const audience = `${subUrl.protocol}//${subUrl.host}`;
          const jwt = await createJwt(vapid.privateKey, vapid.publicKey, audience, vapid.subject);

          const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
              "Content-Length": "0",
              TTL: "86400",
            },
          });

          if (res.status === 201 || res.status === 200) sent++;
          else if (res.status === 404 || res.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          }
          await res.text();
        } catch (e) {
          console.error("Push send error:", e);
        }
      }

      return new Response(JSON.stringify({ ok: true, sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
