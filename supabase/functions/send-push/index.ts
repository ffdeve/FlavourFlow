// Supabase Edge Function: deliver an Expo push when a notification row is inserted.
//
// Wire-up (done once by the project owner, on the dashboard):
//   1. supabase functions deploy send-push
//   2. Database → Webhooks → create a webhook on INSERT of public.notifications
//      that POSTs to this function's URL.
//
// The webhook sends the inserted row as `record`. We look up the recipient's
// push_token and forward a push to Expo's push service. RLS does not apply here
// (service role), so we read push_token directly.

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record = body?.record ?? body;
    const recipientId: string | undefined = record?.recipient_id;
    if (!recipientId) {
      return new Response("no recipient", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", recipientId)
      .single();

    const token = profile?.push_token;
    if (!token || !token.startsWith("ExponentPushToken")) {
      return new Response("no token", { status: 200 });
    }

    const message = {
      to: token,
      sound: "default",
      title: record?.title ?? "FlavourFlow",
      body: record?.message ?? "",
      data: record?.data ?? {},
    };

    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    return new Response(await res.text(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response("error", { status: 200 });
  }
});
