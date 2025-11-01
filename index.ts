import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const body = await req.json();
  const message = body.message;
  const tgUsername = message?.from?.username;
  const chatId = message?.chat?.id;

  if (!tgUsername || !chatId) return new Response("No data", { status: 200 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("tg_username", tgUsername);

  if (profiles?.length) {
    await supabase
      .from("profiles")
      .update({ chat_bot_id: chatId })
      .eq("id", profiles[0].id);
  }

  return new Response("OK", { status: 200 });
});
