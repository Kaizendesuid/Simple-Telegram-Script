const fs = require("fs");
const path = require("path");
const settings = require("../setting");
const dbPath = path.join(__dirname, "../db/database.json");
const loadDB = () => JSON.parse(fs.readFileSync(dbPath));
const saveDB = (data) =>
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
const parseDuration = (text) => {
  if (!text || text === "perma") return null;
  const num = parseInt(text);
  const type = text.slice(-1);

  if (type === "h") return num * 60 * 60 * 1000;
  if (type === "d") return num * 24 * 60 * 60 * 1000;
  if (type === "m") return num * 30 * 24 * 60 * 60 * 1000;

  return null;
};

const formatTime = (ms) => {
  if (!ms) return "Permanent";
  
  const remaining = ms - Date.now();
  if (remaining <= 0) return "Expired";
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  return `${hours}h`;

};

const getTargetUser = (msg, args) => {

  if (msg.reply_to_message)
    return msg.reply_to_message.from.id;
  if (msg.entities) {

    const mention = msg.entities.find(
      e => e.type === "mention"
    );
    if (mention) {

      const username = msg.text
        .slice(mention.offset + 1, mention.offset + mention.length);
      const db = loadDB();
      const user = Object.values(db.users)
        .find(u => u.username === username);

      if (user) return user.id;
    }
  }

  if (args[1] && /^\d+$/.test(args[1]))
    return args[1];
  return null;

};

const saveHistory = (userId, action, role) => {
  const db = loadDB();
  if (!db.roleHistory) db.roleHistory = [];

  db.roleHistory.push({
    userId,
    role,
    action,
    time: Date.now()
  });
  saveDB(db);
};

const addRoleHandler = async (bot, msg) => {
  const args = msg.text.trim().split(" ");
  const targetId = getTargetUser(msg, args);

  if (!targetId)
    return bot.sendMessage(
      msg.chat.id,
      "Format:\n/addrole (user) (role) (1h/1d/perma)"
    );

  const role = args[2];
  const durationText = args[3] || "perma";
  const duration = parseDuration(durationText);
  const db = loadDB();

  if (!db.users[targetId])
    return bot.sendMessage(
      msg.chat.id,
      "User belum terdaftar."
    );

  db.users[targetId].role = role;

  if (duration)
    db.users[targetId].roleExpire = Date.now() + duration;
  else
    db.users[targetId].roleExpire = null;

  saveDB(db);
  saveHistory(targetId,"add",role);

  await bot.sendMessage(
    msg.chat.id,
`✅ Role diberikan

User : ${targetId}
Role : ${role}
Durasi : ${durationText}`
  );

  try {
    await bot.sendMessage(
      targetId,
`🎭 ROLE UPDATE

Role : ${role}
Durasi : ${durationText}

Diberikan oleh @${settings.OWNER_USERNAME}`
    );
  } catch {}
};

const removeRoleHandler = async (bot,msg)=>{
  const args = msg.text.split(" ");
  const targetId = getTargetUser(msg,args);

  if(!targetId)
    return bot.sendMessage(msg.chat.id,"Format:\n/removerole user");

  const db = loadDB();

  if(!db.users[targetId])
    return bot.sendMessage(msg.chat.id,"User tidak ditemukan");

  db.users[targetId].role="user";
  db.users[targetId].roleExpire=null;

  saveDB(db);
  saveHistory(targetId,"remove","user");

  await bot.sendMessage(msg.chat.id,"Role berhasil dihapus");

};

const roleInfoHandler = async(bot,msg)=>{
  const args = msg.text.split(" ");
  const targetId = getTargetUser(msg,args);

  if(!targetId)
    return bot.sendMessage(msg.chat.id,"Format:\n/roleinfo user");

  const db = loadDB();
  const user=db.users[targetId];

  if(!user)
    return bot.sendMessage(msg.chat.id,"User tidak ditemukan");

  const expire=formatTime(user.roleExpire);

  return bot.sendMessage(
msg.chat.id,
`👤 ROLE INFO

ID : ${user.id}
Role : ${user.role}
Expire : ${expire}`
  );

};

const editRoleHandler = async(bot,msg)=>{
  const args = msg.text.split(" ");
  const targetId=getTargetUser(msg,args);
  const durationText=args[2];

  if(!targetId || !durationText)
    return bot.sendMessage(msg.chat.id,"Format:\n/editrole user 1d");

  const duration=parseDuration(durationText);
  const db=loadDB();

  if(!db.users[targetId])
    return bot.sendMessage(msg.chat.id,"User tidak ditemukan");
  if(duration)
    db.users[targetId].roleExpire=Date.now()+duration;

  saveDB(db);

  await bot.sendMessage(
msg.chat.id,
"Durasi role berhasil diupdate"
  );
};

const roleHistoryHandler = async(bot,msg)=>{
  const db=loadDB();
  if(!db.roleHistory || db.roleHistory.length===0)
    return bot.sendMessage(msg.chat.id,"Belum ada history role");

  const last=db.roleHistory.slice(-10).reverse();
  let text="📜 ROLE HISTORY\n\n";

  last.forEach(h=>{
    text+=`User ${h.userId} ${h.action} role ${h.role}\n`;
  });
  bot.sendMessage(msg.chat.id,text);
};

const buildRoleList = () => {
  const db = loadDB();
  const roles = {};

  Object.values(db.users).forEach(u => {

    if (!roles[u.role]) roles[u.role] = [];
    roles[u.role].push(u);
  });
  return roles;
};

const listRoleHandler = async (bot, msg) => {
  const roles = buildRoleList();
  const roleNames = Object.keys(roles);
  let text = "📊 LIST ROLE\n\n";
  roleNames.forEach(r => {
    text += `${r} : ${roles[r].length}\n`;
  });
  const keyboard = [];
  for (let i = 0; i < roleNames.length; i += 2) {
    const row = [];
    row.push({
      text: roleNames[i],
      callback_data: `role_${roleNames[i]}`
    });
    if (roleNames[i + 1]) {
      row.push({
        text: roleNames[i + 1],
        callback_data: `role_${roleNames[i + 1]}`
      });
    }
    keyboard.push(row);
  }
  bot.sendMessage(msg.chat.id,text,{
    reply_markup:{inline_keyboard:keyboard}
  });
};

const roleDetailHandler = async (bot, msg) => {
  const role = msg.data.split("_")[1];
  const db = loadDB();
  const users = Object.values(db.users)
    .filter(u => u.role === role);
  let text = `🎭 ROLE: ${role}\n\n`;
  users.forEach(u => {
    text += `• ${u.first_name || "User"} (${u.id})\n`;
  });
  bot.editMessageText(
    text,
    {
      chat_id: msg.chat.id,
      message_id: msg.message_id
    }
  );
};

setInterval(() => {
  const db = loadDB();
  let changed = false;

  Object.values(db.users).forEach(u => {

    if (u.roleExpire && Date.now() > u.roleExpire) {

      saveHistory(u.id,"expired",u.role);

      u.role = "user";
      u.roleExpire = null;
      changed = true;
    }
  });
  if (changed) saveDB(db);
},60000);

module.exports = [
  {
    keyword:"/addrole",
    owner:true,
    register:true,
    handler:addRoleHandler
  },
  {
    keyword:"/removerole",
    owner:true,
    register:true,
    handler:removeRoleHandler
  },
  {
    keyword:"/listrole",
    owner:true,
    register:true,
    handler:listRoleHandler
  },
  {
    keyword:"/roleinfo",
    owner:true,
    register:true,
    handler:roleInfoHandler
  },
  {
    keyword:"/editrole",
    owner:true,
    register:true,
    handler:editRoleHandler
  },
  {
    keyword:"/rolehistory",
    owner:true,
    register:true,
    handler:roleHistoryHandler
  },
  {
    callbackKeyword:"role_",
    handler:roleDetailHandler
  }
];