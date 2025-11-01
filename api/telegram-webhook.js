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
  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("id, tg_chat_id")
    .eq("tg_username", tgUsername);

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return res.status(500).send("Supabase fetch error");
  }

  if (!users || users.length === 0) {
    await sendMessage(chatId, "Ваш Telegram не найден в системе. Проверьте настройки профиля.");
    return res.status(200).send("User not found");
  }

  const user = users[0];

  // Проверка: если tg_chat_id уже установлен — ничего не делаем
  if (user.tg_chat_id) {
    console.log(`User ${tgUsername} already has tg_chat_id: ${user.tg_chat_id}`);
    return res.status(200).send("Already linked");
  }

  // Обновляем tg_chat_id
  const { error: updateError } = await supabase
    .from("users")
    .update({ tg_chat_id: chatId })
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
