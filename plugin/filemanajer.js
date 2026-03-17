const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PAGE_SIZE = 3500;

const findFile = (filename, dir = ROOT_DIR, results = []) => {

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (file === "node_modules") continue;
      findFile(filename, full, results);
    } else {
      if (file.toLowerCase() === filename.toLowerCase()) {
        results.push(full);
      }
    }
  }
  return results;
};

const resolvePath = (input) => {
  const direct = path.join(ROOT_DIR, input);
  if (fs.existsSync(direct)) return direct;

  const filename = path.basename(input);
  const results = findFile(filename);

  if (results.length === 0)
    throw new Error("File tidak ditemukan.");
  if (results.length > 1) {

    throw new Error(
      "Ditemukan beberapa file:\n" +
      results.map(p => path.relative(ROOT_DIR,p)).join("\n")
    );

  }

  const normalized = path.normalize(results[0]);

  if (!normalized.startsWith(ROOT_DIR))
    throw new Error("Akses path tidak diizinkan.");
  if (normalized.includes(".env"))
    throw new Error("File sensitif tidak bisa diakses.");
  return normalized;
};

const escapeHTML = (text) => {

  return text
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");

};

const buildPage = (content, page, filePath) => {
  const pages = Math.ceil(content.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const slice = content.slice(start, end);

  const text =
`📄 FILE VIEWER

Path :
<code>${filePath}</code>

Page ${page + 1}/${pages}

━━━━━━━━━━━━━━

<pre>${escapeHTML(slice)}</pre>`;

  const row = [];

  if (page > 0) {
    row.push({
      text: "⬅ Prev",
      callback_data: `filepage|${filePath}|${page - 1}`
    });
  }
  row.push({
    text: `${page + 1}/${pages}`,
    callback_data: "noop"
  });
  
  if (page < pages - 1) {
    row.push({
      text: "Next ➡",
      callback_data: `filepage|${filePath}|${page + 1}`
    });
  }
  const keyboard = {
    inline_keyboard: [row]
  };
  return { text, keyboard, pages };
};

const getFileHandler = async (bot,msg) => {
  const chatId = msg.chat.id;
  const args = msg.text.split(" ");
  const filePath = args[1];

  if (!filePath)
    return bot.sendMessage(chatId,
`Format:

/getfile main.js
/getfile mute.js
/getfile plugin/mute.js`);

  try {
    const target = resolvePath(filePath);
    const relative = path.relative(ROOT_DIR,target);
    const content = fs.readFileSync(target,"utf8");
    const {text,keyboard} = buildPage(content,0,relative);

    await bot.sendMessage(chatId,text,{
      parse_mode:"HTML",
      reply_markup:keyboard
    });
  }
  catch (err) {
    bot.sendMessage(chatId,err.message);
  }
};

const filePageCallback = async (bot,msg) => {
  const data = msg.data;

  if (!data.startsWith("filepage")) return;

  const parts = data.split("|");
  const filePath = parts[1];
  const page = parseInt(parts[2]);

  try{

    const target = resolvePath(filePath);
    const content = fs.readFileSync(target,"utf8");
    const {text,keyboard,pages} = buildPage(content,page,filePath);

    if (page < 0 || page >= pages)
      return bot.answerCallbackQuery(msg.id);
await bot.answerCallbackQuery(msg.id);
    await bot.editMessageText(text,{
      chat_id:msg.chat.id,
      message_id:msg.message_id,
      parse_mode:"HTML",
      reply_markup:keyboard
    });
  }
  catch(err){

    bot.answerCallbackQuery(msg.id,{
      text:err.message,
      show_alert:true
    });

  }

};

const sendFileHandler = async (bot,msg) => {
  const chatId = msg.chat.id;
  const args = msg.text.split(" ");
  const filePath = args[1];

  if (!filePath)
    return bot.sendMessage(chatId,"/sendfile mute.js");
  try {
    const target = resolvePath(filePath);
    const relative = path.relative(ROOT_DIR,target);

    await bot.sendDocument(chatId,target,{
      caption:`📦 FILE DOWNLOAD\n${relative}`
    });
  }
  catch (err) {
    bot.sendMessage(chatId,err.message);
  }
};

const cleanCode = (text) => {
  if (!text) return "";

  return text
    .replace(/```[a-z]*\n?/gi,"")
    .replace(/```/g,"")
    .trim();
};

const addFileHandler = async (bot,msg) => {
  const chatId = msg.chat.id;
  const args = msg.text.split(" ");
  const filePath = args[1];

  if (!filePath)
    return bot.sendMessage(chatId,"Reply code dengan /addfile path/file.js");
  if (!msg.reply_to_message)
    return bot.sendMessage(chatId,"Reply pesan yang berisi code.");

  const code = cleanCode(msg.reply_to_message.text);

  if (!code)
    return bot.sendMessage(chatId,"Pesan reply tidak berisi text.");

  try {
    const target = path.join(ROOT_DIR,filePath);
    const dir = path.dirname(target);

    if (!fs.existsSync(dir))
      fs.mkdirSync(dir,{recursive:true});

    const exists = fs.existsSync(target);

    fs.writeFileSync(target,code);

    await bot.sendMessage(chatId,
`📁 FILE SAVED

Path :
<code>${filePath}</code>

Status :
${exists ? "Replaced" : "Created"}`,
      {parse_mode:"HTML"}
    );
  }
  catch (err) {
    bot.sendMessage(chatId,err.message);
  }
};

const deleteFileHandler = async (bot,msg) => {
  const chatId = msg.chat.id;
  const args = msg.text.split(" ");
  const filePath = args[1];

  if (!filePath)
    return bot.sendMessage(chatId,"/delfile mute.js");
  try {

    const target = resolvePath(filePath);
    const relative = path.relative(ROOT_DIR,target);

    fs.unlinkSync(target);

    await bot.sendMessage(chatId,
`🗑 FILE DELETED

<code>${relative}</code>`,
      {parse_mode:"HTML"}
    );
  }
  catch (err) {
    bot.sendMessage(chatId,err.message);
  }
};

const handler = async (bot,msg) => {
  const text = msg.text || "";

  if (msg.data && msg.data.startsWith("filepage|"))
    return filePageCallback(bot,msg);
  if (text.startsWith("/getfile"))
    return getFileHandler(bot,msg);
  if (text.startsWith("/sendfile"))
    return sendFileHandler(bot,msg);
  if (text.startsWith("/addfile"))
    return addFileHandler(bot,msg);
  if (text.startsWith("/delfile"))
    return deleteFileHandler(bot,msg);

};

module.exports = {
  keyword: "/getfile",
  callbackKeyword: "filepage|",
  keywordAliases: [
    "/sendfile",
    "/addfile",
    "/delfile"
  ],
  owner: true,
  category: "┆ OWNER ┆",
  description: "Remote file manager bot.",
  handler
};