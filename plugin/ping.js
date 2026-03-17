const os = require("os");
const process = require("process");

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatUptime = (uptime) => {
  const d = Math.floor(uptime / (3600 * 24));
  const h = Math.floor((uptime % (3600 * 24)) / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

const pingLogic = async (bot, msg) => {
  const chatId = msg.chat.id;
  const startTime = Date.now();

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const processMem = process.memoryUsage();
  const uptime = os.uptime();
  const loadAvg = os.loadavg();

  const cpuModel = os.cpus()[0].model;
  const cpuCores = os.cpus().length;

  const hostname = os.hostname();
  const platform = os.platform();
  const arch = os.arch();
  const nodeVersion = process.version;
  const pid = process.pid;

  const pingMsg = await bot.sendMessage(
    chatId,
    "```... Analysing Server Trace ...```",
    { parse_mode: "Markdown" }
  );

  const latency = Date.now() - startTime;
  const telegramLatency = Math.abs(Date.now() - pingMsg.date * 1000);

  const responseText = `
\`\`\`bash
# SYSTEM INFORMATION

  HOSTNAME       : ${hostname}
  PLATFORM       : ${platform} (${arch})
  NODE VERSION   : ${nodeVersion}
  PROCESS ID     : ${pid}

  SERVER UPTIME  : ${formatUptime(uptime)}

# CPU INFORMATION

  MODEL          : ${cpuModel}
  CORES          : ${cpuCores}
  LOAD AVG       : ${loadAvg.map(n => n.toFixed(2)).join(" | ")}

# MEMORY (SERVER)

  TOTAL RAM      : ${formatBytes(totalMem)}
  USED RAM       : ${formatBytes(usedMem)}
  FREE RAM       : ${formatBytes(freeMem)}

# MEMORY (BOT PROCESS)

  RSS            : ${formatBytes(processMem.rss)}
  HEAP USED      : ${formatBytes(processMem.heapUsed)}
  HEAP TOTAL     : ${formatBytes(processMem.heapTotal)}

# NETWORK LATENCY

  BOT RESPONSE   : ${latency} ms
  TELEGRAM API   : ${telegramLatency} ms
\`\`\`
`;

  try {
    await bot.editMessageText(responseText, {
      chat_id: chatId,
      message_id: pingMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.sendMessage(chatId, responseText, {
      parse_mode: "Markdown",
    });
  }
};

module.exports = {
  keyword: "/ping",
  keywordAliases: ["/p", "/speed", "/test"],
  category: "┆ INFO ┆",
  description: "Kecepatan respon bot",
  handler: pingLogic,
};