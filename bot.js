require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// CONFIG
let botActivo = true;
const admins = [8114050673];
const usuariosVIP = [8114050673];
const owner = "@Broquicalifoxx";

// ================== START ==================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
╔════════════════════════════╗
   🤖 CONSULTAS PRO BOT
╚════════════════════════════╝

👑 Sistema activo

📌 Comandos:
/menu
/estado

👑 Owner: ${owner}
    `);
});

// ================== MENU ==================
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, `
╔════════════════════════════╗
        📋 MENÚ PRINCIPAL
╚════════════════════════════╝

🔎 /consultar número
📱 /nequi número
📊 /estado

👑 Solo usuarios VIP

━━━━━━━━━━━━━━━━━━━━━━
👑 Owner: ${owner}
    `);
});

// ================== ESTADO ==================
bot.onText(/\/estado/, (msg) => {
    bot.sendMessage(msg.chat.id, `
╔════════════════════════════╗
        ⚙️ ESTADO
╚════════════════════════════╝

🤖 Bot: ${botActivo ? "🟢 ACTIVO" : "🔴 OFF"}
👑 Usuarios VIP: ${usuariosVIP.length}

━━━━━━━━━━━━━━━━━━━━━━
👑 Owner: ${owner}
    `);
});

// ================== ADMIN ==================
bot.onText(/\/on/, (msg) => {
    if (!admins.includes(msg.from.id)) return;
    botActivo = true;

    bot.sendMessage(msg.chat.id, `
🟢 BOT ACTIVADO

👑 Owner: ${owner}
    `);
});

bot.onText(/\/off/, (msg) => {
    if (!admins.includes(msg.from.id)) return;
    botActivo = false;

    bot.sendMessage(msg.chat.id, `
🔴 BOT DESACTIVADO

👑 Owner: ${owner}
    `);
});

bot.onText(/\/addvip (.+)/, (msg, match) => {
    if (!admins.includes(msg.from.id)) return;

    const id = parseInt(match[1]);

    if (!usuariosVIP.includes(id)) {
        usuariosVIP.push(id);

        bot.sendMessage(msg.chat.id, `
✅ USUARIO AGREGADO VIP

🆔 ID: ${id}

👑 Owner: ${owner}
        `);
    }
});

// ================== CONSULTA ==================
bot.onText(/\/consultar (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!botActivo) {
        return bot.sendMessage(msg.chat.id, "⛔ Bot en mantenimiento");
    }

    if (!usuariosVIP.includes(userId)) {
        return bot.sendMessage(msg.chat.id, `
❌ ACCESO DENEGADO

👑 Solo VIP
📞 Contacta: ${owner}
        `);
    }

    bot.sendMessage(msg.chat.id, `
🔍 PROCESANDO CONSULTA...

📱 Número: ${numero}
⏳ Espera un momento...
    `);

    setTimeout(() => {
        bot.sendMessage(msg.chat.id, `
╔════════════════════════════╗
     📊 RESULTADO CONSULTA
╚════════════════════════════╝

🔢 Número: ${numero}
📊 Estado: POSIBLEMENTE REGISTRADO

💡 Nota:
• Resultado estimado
• Puede variar

━━━━━━━━━━━━━━━━━━━━━━
👑 Owner: ${owner}
⏱️ Tiempo: 0.45s
        `);
    }, 2000);
});

// ================== NEQUI ==================
bot.onText(/\/nequi (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!usuariosVIP.includes(userId)) {
        return bot.sendMessage(msg.chat.id, `
❌ SOLO VIP

📞 Contacta: ${owner}
        `);
    }

    const estados = ["ACTIVO", "NO REGISTRADO", "POSIBLE"];

    const estado = estados[Math.floor(Math.random() * estados.length)];

    bot.sendMessage(msg.chat.id, `
╔════════════════════════════╗
      📱 CONSULTA NEQUI
╚════════════════════════════╝

🔢 Número: ${numero}
📊 Estado: ${estado}

💡 Resultado estimado

━━━━━━━━━━━━━━━━━━━━━━
👑 Owner: ${owner}
    `);
});