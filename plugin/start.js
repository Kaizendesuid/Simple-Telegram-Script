const path = require("path");
const fs = require("fs");
const settings = require("../setting");
const { formatUptime, getTimeInfo } = require("../handler");
const WELCOME_IMAGE_PATH = path.join(__dirname, "..", "media", "thumbnail.jpg");

const startHandler = async (bot, msg) => {
  const chatId = msg.chat.id;
  const botName = settings.BOT_NAME;
  const ownerClean = settings.OWNER_USERNAME.replace("@", "");
  const userMention = msg.from.username ?
    `@${msg.from.username}` :
    msg.from.first_name;
  const timeInfo = getTimeInfo();
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "✨ LIST FITUR", callback_data: "/fitur" }
      ],
      [
        { text: "💰 DEPOSIT NOKOS", callback_data: "/depositnokos" },
        { text: "📱 NOKOS", callback_data: "/nokos" }
      ],
      [
        { text: "👨‍💻 DEVELOPER", url: `https://t.me/${ownerClean}` },
        { text: "💬 TESTIMONI", url: "https://t.me/testimonikaidesu" }
      ]
    ]
  };
  
  const welcomeText = `
👋 Selamat ${timeInfo.greeting}, <b>${userMention}</b>!

<pre>Selamat datang di <b>${botName}</b>. Layanan bot otomatis yang siap melayani kebutuhan Anda 24/7 dengan cepat dan aman.</pre>

📅 <b>INFO WAKTU</b>
┣ 🗓️ Hari: <code>${timeInfo.day}</code>
┣ 📅 Tanggal: <code>${timeInfo.date}</code>
┗ ⌚ Jam: <code>${timeInfo.time} WIB</code>

🤖 <b>DASHBOARD SYSTEM</b>
┣ 🏷️ Bot Name: <b>${botName}</b>
┣ ⏱️ Runtime: <code>${formatUptime(process.uptime())}</code>
┣ 📜 Version: <code>${settings.BOT_VERSION || "1.0.0"}</code>
┗ 🧑‍💻 Author: <a href="https://t.me/${ownerClean}">${ownerClean}</a>

<i>Enjoyy 🚀</i>
`;
  
  if (msg.message_id && msg.chat) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch {}
  }
  
  if (fs.existsSync(WELCOME_IMAGE_PATH)) {
    
    await bot.sendPhoto(chatId, WELCOME_IMAGE_PATH, {
      caption: welcomeText,
      parse_mode: "HTML",
      reply_markup: replyMarkup
    }).catch(() =>
      bot.sendMessage(chatId, welcomeText, {
        parse_mode: "HTML",
        reply_markup: replyMarkup
      })
    );
  } else {
    await bot.sendMessage(chatId, welcomeText, {
      parse_mode: "HTML",
      reply_markup: replyMarkup
    });
  }
};

module.exports = {
  keyword: "/start",
  keywordAliases: ["/start_callback"],
  visible: false,
  register: true,
  handler: startHandler
};