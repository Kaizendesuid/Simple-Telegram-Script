const path = require("path");
const fs = require("fs");
const { getUptime } = require("../handler");

const OWNER_VIDEO_PATH = path.join(__dirname, "..", "media", "vid.mp4");
const OWNER_IMAGE_PATH = path.join(__dirname, "..", "media", "thumbnail.jpg");

const ownerHandler = async (bot, msg, settings) => {
  const chatId = msg.chat.id;
  const ownerRaw = settings.OWNER_USERNAME || "Kaizen";
  const ownerClean = ownerRaw.replace("@", "");
  const uptime = getUptime();
  const buttons = [];
  const row1 = [];
  
  if (settings.OWNER_YOUTUBE)
    row1.push({ text: "🔴 YouTube", url: settings.OWNER_YOUTUBE });
  if (settings.OWNER_TIKTOK)
    row1.push({ text: "🎵 TikTok", url: settings.OWNER_TIKTOK });
  if (row1.length > 0) buttons.push(row1);
  
  const row2 = [];
  
  if (settings.OWNER_INSTAGRAM)
    row2.push({ text: "📸 Instagram", url: settings.OWNER_INSTAGRAM });
  
  row2.push({
    text: "💬 Telegram",
    url: `https://t.me/${ownerClean}`
  });
  
  buttons.push(row2);
  
  const inlineKeyboard = {
    inline_keyboard: buttons
  };
  
  const caption = `
<b>╔══════════════════╗</b>
<b>   BOT DEVELOPER</b>
<b>╚══════════════════╝</b>

<b>🤖 BOT INFORMATION</b>
<pre>
Bot Name   : ${settings.BOT_NAME}
Status     : ONLINE
Version    : ${settings.BOT_VERSION || "1.0.0"}
Runtime    : ${uptime}
</pre>

<b> DEVELOPER</b>
<pre>
Name       : ${ownerRaw}
Username   : @${ownerClean}
User ID    : ${settings.OWNER_TELEGRAM_ID}
</pre>

<blockquote>
Jika menemukan bug, ingin kerja sama,
atau request fitur baru,
silakan hubungi developer melalui
tombol di bawah ini.
</blockquote>

<i>© ${new Date().getFullYear()} ${settings.BOT_NAME}</i>
`;
  
  if (fs.existsSync(OWNER_VIDEO_PATH)) {
    await bot.sendVideo(chatId, OWNER_VIDEO_PATH, {
      caption,
      parse_mode: "HTML",
      reply_markup: inlineKeyboard
    });
    return;
  }
  
  if (fs.existsSync(OWNER_IMAGE_PATH)) {
    await bot.sendPhoto(chatId, OWNER_IMAGE_PATH, {
      caption,
      parse_mode: "HTML",
      reply_markup: inlineKeyboard
    });
    return;
  }
  await bot.sendMessage(chatId, caption, {
    parse_mode: "HTML",
    reply_markup: inlineKeyboard
  });
};

module.exports = {
  keyword: "/owner",
  category: "┆ INFO ┆",
  description: "Menampilkan profil developer bot.",
  handler: ownerHandler
};