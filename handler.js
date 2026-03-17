const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const settings = require("./setting");
const dbPath = path.join(__dirname, "db", "database.json");

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(
    dbPath,
    JSON.stringify({ users: {} }, null, 2)
  );
}

const loadDB = () => {
  const data = JSON.parse(fs.readFileSync(dbPath));
  if (!data.users) data.users = {};
  return data;
};
const saveDB = (data) =>
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

global.mess = {
  group:
`⚠️ WARNING...
Command ini **KHUSUS PRIVATE CHAT** sama bot ya.

Klik tombol di bawah buat lanjut 👇`,
  admin:
`🚫 Eh boss...Fitur ini cuma buat **ADMIN**.`,
  private:
`📩 Gunakan command ini di **PRIVATE CHAT** bot ya.`,
  owner:
`🚫 Waduh...Fitur ini cuma bisa dipakai **OWNER**.`,
  botadmin:
`⚠️ Bot belum jadi **ADMIN GROUP*.`,
  register:
`🚫 Kamu belum terdaftar.

Join grup dulu baru bisa pakai bot.`
};

const isRegistered = (userId) => {
  const db = loadDB();
  return !!db.users[userId];
};

const registerUser = async (bot, msg) => {
  const db = loadDB();
  const userId = msg.from.id.toString();
  if (!db.users[userId]) {

    db.users[userId] = {
      id: userId,
      username: msg.from.username || null,
      first_name: msg.from.first_name || "",
      last_name: msg.from.last_name || "",
      role:
        userId == settings.OWNER_TELEGRAM_ID
          ? "owner"
          : "user",
      registeredAt: new Date().toISOString()
    };
    saveDB(db);
    await notifyOwner(bot, msg.from, "join");
  }
};

const checkAccess = async (bot, msg, plugin) => {
  const db = loadDB();
  const userId = msg.from.id.toString();
  const user = db.users[userId];
  const isGroup = msg.chat.type.includes("group");
  const isPrivate = msg.chat.type === "private";
  const isOwner = user && user.role === "owner";
  const isAdmin = user && user.role === "admin";

  if (plugin.private && !isPrivate) {

    return bot.sendMessage(msg.chat.id, global.mess.group, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "💬 Buka Private Chat",
              url: `https://t.me/${settings.BOT_NAME.replace(" ","")}`
            }
          ]
        ]
      }
    });
  }
  if (plugin.group && !isGroup)
    return bot.sendMessage(msg.chat.id, global.mess.group);
  if (plugin.register && !user)
    return bot.sendMessage(msg.chat.id, global.mess.register);
  if (plugin.owner && !isOwner)
    return bot.sendMessage(msg.chat.id, global.mess.owner);
  if (plugin.admin && !(isAdmin || isOwner))
    return bot.sendMessage(msg.chat.id, global.mess.admin);
  return true;
};


const checkGroupMembership = async (bot, userId) => {
  if (userId == settings.OWNER_TELEGRAM_ID) return true;
  try {
    const member = await bot.getChatMember(
      settings.REQUIRED_GROUP_ID,
      userId
    );
    return !["left", "kicked"].includes(member.status);
  } catch {
    return false;
  }
};

const sendJoinMessage = async (bot, msg) => {

  return await bot.sendMessage(
    msg.chat.id,
`⚠️ Sebelum pakai bot ini kamu harus join grup dulu ya.

Setelah join, tekan tombol Refresh.`,
    {
      parse_mode:"HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔗 Join Grup",
              url: settings.REQUIRED_GROUP_LINK
            }
          ],
          [
            {
              text: "🔄 Refresh",
              callback_data: "refresh_join"
            }
          ]
        ]
      }
    }
  );

};

const notifyOwner = async (bot, user, type) => {
  try {
    const userId = user.id;
    const username = user.username
      ? `@${user.username}`
      : "-";
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const mention = `<a href="tg://user?id=${userId}">${fullName || "User"}</a>`;
    const time = moment()
      .tz("Asia/Jakarta")
      .format("DD MMMM YYYY HH:mm:ss");

    const caption =
`<b>🟢 USER REGISTER</b>

👤 Nama : ${mention}
📛 Username : ${username}
🆔 User ID : <code>${userId}</code>
⏰ Waktu : ${time} WIB`;

    const photos = await bot.getUserProfilePhotos(userId,{limit:1});
    const keyboard = {
      inline_keyboard:[
        [
          {
            text:"👤 Lihat Profil User",
            url:`tg://user?id=${userId}`
          }
        ]
      ]
    };
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;

      await bot.sendPhoto(
        settings.OWNER_TELEGRAM_ID,
        fileId,
        {
          caption,
          parse_mode:"HTML",
          reply_markup:keyboard
        }
      );
    } else {
      await bot.sendMessage(
        settings.OWNER_TELEGRAM_ID,
        caption,
        {
          parse_mode:"HTML",
          reply_markup:keyboard
        }
      );
    }
  } catch (err) {
    console.log("Owner notify error:", err.message);
  }
};

const sendGroupWelcome = async (bot,user) => {
  try{
    const name = user.first_name || "User";

    await bot.sendMessage(
      settings.REQUIRED_GROUP_ID,
`🎉 Selamat datang **${name}**!

Terima kasih sudah bergabung di grup ini.

📌 Untuk menggunakan bot:
1️⃣ Chat bot di private
2️⃣ Ketik /start
3️⃣ Ikuti instruksi bot

Selamat menikmati layanan 🚀`,
      {
        parse_mode:"Markdown"
      }
    );
  }catch(err){}
};


const handleUserLeave = async () => {};
const handleRejoinCallback = async () => {};


const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  let parts = [];

  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);

  return parts.join(" ") || "Baru mulai";
};
const getUptime = () => {
  return formatUptime(process.uptime());
};

const getTimeInfo = () => {
  const jktTime = moment.tz("Asia/Jakarta");
  const greeting =
    jktTime.hour() < 12 ? "Pagi ☀️" :
    jktTime.hour() < 15 ? "Siang 🌤️" :
    jktTime.hour() < 18 ? "Sore 🌥️" :
    "Malam 🌙";

  return {
    greeting,
    day: jktTime.format("dddd"),
    date: jktTime.format("DD MMMM YYYY"),
    time: jktTime.format("HH:mm:ss")
  };
};

module.exports = {
  registerUser,
  checkAccess,
  isRegistered,
  checkGroupMembership,
  sendJoinMessage,
  handleUserLeave,
  handleRejoinCallback,
  formatUptime,
  getTimeInfo,
  getUptime,
};