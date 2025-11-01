import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const body = req.body;
  const message = body.message;

  if (!message || !message.from) return res.status(200).send("No message");

  const tgUsername = message.from.username;
  const chatId = message.chat.id;

  if (!tgUsername || !chatId) {
    return res.status(200).send("Missing data");
  }

  // Подключаемся к Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Ищем пользователя по tg_username
  const { data: profiles, error: fetchError } = await supabase
    .from("profiles")
    .select("id, chat_bot_id")
    .eq("tg_username", tgUsername);

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return res.status(500).send("Supabase fetch error");
  }

  if (!profiles || profiles.length === 0) {
    await sendMessage(chatId, "Ваш Telegram не найден в системе. Проверьте настройки профиля.");
    return res.status(200).send("User not found");
  }

  const user = profiles[0];

  // Проверка: если chat_bot_id уже установлен — ничего не делаем
  if (user.chat_bot_id) {
    console.log(`User ${tgUsername} already has chat_bot_id: ${user.chat_bot_id}`);
    return res.status(200).send("Already linked");
  }

  // Обновляем chat_bot_id
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ chat_bot_id: chatId })
    .eq("id", user.id);

  if (updateError) {
    console.error("Update error:", updateError);
    await sendMessage(chatId, "Ошибка при привязке Telegram. Попробуйте позже.");
    return res.status(500).send("Update error");
  }

  // Ответ пользователю (только при первой привязке)
  await sendMessage(chatId, "✅ Ваш Telegram успешно привязан к профилю!");
  return res.status(200).send("Linked");
}

// Отправка сообщения в Telegram
async function sendMessage(chatId, text) {
  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("Send message error:", err);
  }
}
