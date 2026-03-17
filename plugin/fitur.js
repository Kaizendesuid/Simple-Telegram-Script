const path = require("path");
const fs = require("fs");

const MENU_IMAGE_PATH = path.join(__dirname, "..", "media", "fitur.jpg");

const fiturHandler = async (
  bot,
  msg,
  settings,
  loadDB,
  saveDB,
  allHandlers
) => {

  const chatId = msg.chat.id;
  const botName = settings.BOT_NAME;
  const username = msg.from.username
    ? `@${msg.from.username}`
    : msg.from.first_name;
  const callbackData = msg.data || msg.text || null;
  const isCallback = !!msg.data;
  const groups = {};
  
  allHandlers.forEach((handler) => {

    if (handler.visible === false) return;
    const category = handler.category || "LAIN-LAIN";
    if (!groups[category]) groups[category] = [];
    if (
      handler.keyword &&
      typeof handler.keyword === "string" &&
      handler.keyword.startsWith("/")
    ) {
      groups[category].push({
        cmd: handler.keyword,
        desc: handler.description || "Tidak ada deskripsi.",
        isAlias: false
      });
    }
    if (handler.keywordAliases && Array.isArray(handler.keywordAliases)) {

      handler.keywordAliases.forEach((alias) => {

        if (
          alias !== handler.keyword &&
          typeof alias === "string" &&
          alias.startsWith("/")
        ) {
          groups[category].push({
            cmd: alias,
            desc: "",
            isAlias: true
          });
        }
      });
    }
  });

  const categories = Object.keys(groups).sort();

  if (callbackData && callbackData.startsWith("/fitur_")) {
    const selectedCat = decodeURIComponent(
      callbackData.replace("/fitur_", "")
    );
    const listFitur = groups[selectedCat];

    if (!listFitur || listFitur.length === 0) {
      return bot.answerCallbackQuery(msg.id, {
        text: "Kategori ini masih kosong.",
        show_alert: false
      }).catch(() => {});
    }

    let menuText = `
<pre>📂 KATEGORI : ${selectedCat}</pre>
━━━━━━━━━━━━━━━━━━
`;

    menuText += listFitur.map((item) => {

      if (item.isAlias) {
        return `↳ <b>${item.cmd}</b>`;
      }

      return `• <b>${item.cmd}</b>
  ┗ <i>${item.desc}</i>`;

    }).join("\n\n");

    menuText += `\n━━━━━━━━━━━━━━━━━━`;

    const keyboardDetail = {
      inline_keyboard: [
        [
          {
            text: "⬅️ Kembali ke Menu Fitur",
            callback_data: "/fitur"
          }
        ]
      ]
    };

    if (isCallback && msg.message_id) {
      try {
        await bot.deleteMessage(chatId, msg.message_id);
      } catch {}
    }

    const sendOptions = {
      caption: menuText,
      parse_mode: "HTML",
      reply_markup: keyboardDetail
    };

    if (fs.existsSync(MENU_IMAGE_PATH)) {

      return bot.sendPhoto(chatId, MENU_IMAGE_PATH, sendOptions)
        .catch(() =>
          bot.sendMessage(chatId, menuText, {
            parse_mode: "HTML",
            reply_markup: keyboardDetail
          })
        );
    } else {
      return bot.sendMessage(chatId, menuText, {
        parse_mode: "HTML",
        reply_markup: keyboardDetail
      });
    }
  }

  const dashboardCaption = `
👋 Halo <b>${username}</b>

Selamat datang di <b>${botName}</b> 🚀

Silakan pilih kategori fitur yang ingin kamu gunakan di bawah ini.

<pre>Total kategori: ${categories.length}</pre>
━━━━━━━━━━━━━━━━━━
`;

  const categoryButtons = [];
  for (let i = 0; i < categories.length; i += 2) {

    const row = [];
    const cat1 = encodeURIComponent(categories[i]);

    row.push({
      text: categories[i],
      callback_data: `/fitur_${cat1}`
    });

    if (categories[i + 1]) {

      const cat2 = encodeURIComponent(categories[i + 1]);

      row.push({
        text: categories[i + 1],
        callback_data: `/fitur_${cat2}`
      });
    }
    categoryButtons.push(row);
  }

  const inlineKeyboardMain = {
    inline_keyboard: [
      ...categoryButtons,
      [
        {
          text: "⬅️ Kembali",
          callback_data: "/start"
        }
      ]
    ]
  };

  if (isCallback && msg.message_id) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch {}
  }

  if (fs.existsSync(MENU_IMAGE_PATH)) {

    await bot.sendPhoto(chatId, MENU_IMAGE_PATH, {
      caption: dashboardCaption,
      parse_mode: "HTML",
      reply_markup: inlineKeyboardMain
    }).catch(() =>
      bot.sendMessage(chatId, dashboardCaption, {
        parse_mode: "HTML",
        reply_markup: inlineKeyboardMain
      })
    );
  } else {

    await bot.sendMessage(chatId, dashboardCaption, {
      parse_mode: "HTML",
      reply_markup: inlineKeyboardMain
    });
  }
};

module.exports = {
  keyword: "/fitur",
  category: "┆ INFO ┆",
  register: true,
  handler: fiturHandler
};