require("dotenv").config();
const settings = require("./setting");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const cfonts = require("cfonts");
const os = require("os");
const axios = require("axios");

const {
  registerUser,
  checkAccess,
  isRegistered,
  checkGroupMembership,
  sendJoinMessage,
  handleUserLeave,
  handleRejoinCallback,
  loadDB,
  saveDB
} = require("./handler");

const token = settings.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
global.bot = bot

const logCommandTerminal = (msg, command) => {
  const user = msg.from || msg;
  const username = user.username ? `@${user.username}` : user.first_name;
  const userId = user.id;
  const time = new Date().toLocaleTimeString("id-ID");

  console.log(
    chalk.green("[CMD]"),
    chalk.yellow(time),
    chalk.cyan(username),
    chalk.gray(`(${userId})`),
    "→",
    chalk.magenta(command)
  );
};

const sendErrorToOwner = async (err, context = {}) => {
  try {
    const errorMsg =
`🚨 BOT ERROR

📁 File : ${context.file || "unknown"}
⚙️ Command : ${context.command || "-"}
👤 User : ${context.user || "-"}
📍 Stack :
${err.stack}

❗ Message :
${err.message}`;

    await bot.sendMessage(
      settings.OWNER_TELEGRAM_ID,
      errorMsg
    );
  } catch (e) {
    console.log("Failed send error to owner");
  }
};

process.on("uncaughtException", async (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  await sendErrorToOwner(err, { file: "system" });
});

process.on("unhandledRejection", async (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  await sendErrorToOwner(reason, { file: "promise" });
});

bot.on("polling_error", async (error) => {

  const ignoreErrors = [
    "EFATAL",
    "ECONNRESET",
    "ETIMEDOUT",
    "EAI_AGAIN"
  ];
  if (ignoreErrors.includes(error.code)) {
    console.log("Polling network warning:", error.message);
    return;
  }
  console.error("Polling Error:", error);
  await sendErrorToOwner(error, {
    file: "telegram polling"
  });
});

const displayDashboard = async (pluginCount) => {
  cfonts.say("KAI", {
    font: "slick",
    align: "left",
    colors: ["cyan"],
  });
  try {
    const { data: ip } = await axios
      .get("https://api.ipify.org")
      .catch(() => ({ data: "Unknown" }));
    const ramTotal = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
    const ramFree = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
    const packageJson = JSON.parse(
      fs.readFileSync("./package.json", "utf-8")
    );

    console.log(chalk.cyan(`╭──⎔ DASHBOARD SISTEM ⎔`));
    console.log(`┣ Name Bot  : ${packageJson.name}`);
    console.log(`┣ Versi     : ${packageJson.version}`);
    console.log(`┣ OS        : ${os.type()}`);
    console.log(`┣ RAM       : ${ramFree}/${ramTotal} GB`);
    console.log(`┣ IP        : ${ip}`);
    console.log(`┣ Owner     : ${settings.OWNER_USERNAME || "Not Set"}`);
    console.log(`╰──⎔`);
    console.log(`┣ Total Fitur : ${pluginCount}`);
    console.log(`┣ Status      : ONLINE\n`);

  } catch (err) {
    console.log("Dashboard error:", err.message);
  }
};

const cooldown = new Map();
const activeUsers = new Set();

setInterval(() => {
  cooldown.clear();
}, 600000);

const pluginDir = path.join(__dirname, "plugin");
let handlers = [];

const loadPlugins = () => {
  handlers = [];
  if (!fs.existsSync(pluginDir)) return;
  
  const loadFromDir = (dir) => {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        loadFromDir(fullPath); 
        continue;
      }
      if (!file.endsWith(".js")) continue;
      try {
        delete require.cache[require.resolve(fullPath)];
        
        const plugin = require(fullPath);
        if (Array.isArray(plugin)) {
          plugin.forEach((p) => handlers.push(p));
        } else {
          handlers.push(plugin);
        }
        console.log(
          chalk.green("[PLUGIN LOADED]"),
          path.relative(pluginDir, fullPath)
        );
      } catch (err) {
        console.error(
          chalk.red(`[PLUGIN ERROR] ${file}:`),
          err.message
        );
        
        sendErrorToOwner(err, {
          file: file
        });
      }
    }
  };
  loadFromDir(pluginDir);
  console.log(
    chalk.cyan(`✅ Total Plugin Loaded: ${handlers.length}\n`)
  );
};
loadPlugins();

let reloadTimeout;

fs.watch(pluginDir, { recursive: true }, (eventType, filename) => {
  if (!filename || !filename.endsWith(".js")) return;
  clearTimeout(reloadTimeout);
  
  reloadTimeout = setTimeout(() => {
    
    console.log(chalk.yellow("♻️ Reloading plugins..."));
    loadPlugins();
  }, 500);
});

bot.on("message", async (msg) => {
  
  if (!msg || !msg.from) return;
  
  let handler;
  
  const userId = msg.from.id;
  const text = msg.text ? msg.text.trim() : "";
  const now = Date.now();
  const last = cooldown.get(userId) || 0;
  
  if (now - last < 2000) return;
  
  cooldown.set(userId, now);
  
  if (activeUsers.has(userId)) return;
  activeUsers.add(userId);
  try {
    const command =
      text.startsWith("/") ?
      text.toLowerCase().split(" ")[0].split("@")[0] :
      null;
    
    if (!command) return;
    
    handler = handlers.find(
      (h) =>
      h.keyword === command ||
      (h.keywordAliases && h.keywordAliases.includes(command))
    );
    if (!handler) return;
    
    logCommandTerminal(msg, command);
    
    if (handler.register) {
      const userIdStr = msg.from.id.toString();
      const existsInDB = isRegistered(userIdStr);
      if (!existsInDB) {
        await sendJoinMessage(bot, msg);
        return;
      }
      const stillJoined = await checkGroupMembership(bot, userIdStr);
      if (!stillJoined) {
        await sendJoinMessage(bot, msg);
        return;
      }
    }
    const access = await checkAccess(bot, msg, handler);
    if (access !== true) return;
    
    await handler.handler(
      bot,
      msg,
      settings,
      loadDB,
      saveDB,
      handlers
    );
  } catch (err) {
    console.error("MESSAGE ERROR:", err);
    await sendErrorToOwner(err, {
      file: handler?.keyword || "message handler",
      command: msg.text,
      user: msg.from?.id
    });
  } finally {
    activeUsers.delete(userId);
  }
});

bot.on("callback_query", async (callbackQuery) => {

  const data = callbackQuery.data;
  const userId = callbackQuery.from.id.toString();
  
  let handler;  
  if (data === "refresh_join") {

    const joined = await checkGroupMembership(bot,userId);

    if (!joined) {
      return bot.answerCallbackQuery(callbackQuery.id,{
        text:"❌ Kamu belum join grup!",
        show_alert:false
      });
    }
    try{
      await bot.deleteMessage(
        callbackQuery.message.chat.id,
        callbackQuery.message.message_id
      );
    }catch{}

    await registerUser(bot,{from:callbackQuery.from});
  
    await bot.answerCallbackQuery(callbackQuery.id,{
      text:"✅ Berhasil terdaftar!",
      show_alert:false
    });

    await bot.sendMessage(
      callbackQuery.message.chat.id,
      "🚀 Sekarang kamu bisa menggunakan bot.",
      {
        reply_markup:{
          inline_keyboard:[
            [{text:"Masuk Menu",callback_data:"/start"}]
          ]
        }
      }
    );
    return;
  }

  if (activeUsers.has(userId)) return;
  activeUsers.add(userId);

  try {
    await bot.answerCallbackQuery(callbackQuery.id);

   handler = handlers.find((h) => {
  if (!h) return false;
  if (h.callbackKeyword && data.startsWith(h.callbackKeyword))
    return true;
  if (h.keyword === data)
    return true;
  if (h.callbackHandler && data.startsWith(h.keyword.replace("/", "")))
    return true;
  return false;
});

    if (!handler && data.startsWith("/fitur_")) {
      handler = handlers.find((h) => h.keyword === "/fitur");
    }
    if (!handler) return;

    logCommandTerminal(
      { from: callbackQuery.from },
      data
    );

    const runHandler = handler.callbackHandler || handler.handler;
      await runHandler(
    bot,
    {
      chat: callbackQuery.message.chat,
      message_id: callbackQuery.message.message_id,
      from: callbackQuery.from,
      data: callbackQuery.data,
      id: callbackQuery.id,
      isCallback: true
    },
      settings,
      loadDB,
      saveDB,
      handlers
    );
  } catch (err) {
    console.error("CALLBACK ERROR:", err);

    await sendErrorToOwner(err,{
      file: handler?.keyword || "callback handler",
      command: data,
      user: userId
    });
  } finally {
    activeUsers.delete(userId);
  }
});

bot.on("message", async (msg) => {
  if (!msg.chat || msg.chat.id !== settings.REQUIRED_GROUP_ID) return;
  if (msg.new_chat_members) {
    for (const user of msg.new_chat_members) {
      await registerUser(bot, { from: user });
    }
  }
});

setInterval(()=>{

  console.log(
    chalk.blue("[STATS]"),
    "Users Cached:",
    cooldown.size,
    "| Active:",
    activeUsers.size,
    "| Plugins:",
    handlers.length
  );

},300000);

displayDashboard(handlers.length);

console.log(chalk.green("🚀 Bot is running..."));