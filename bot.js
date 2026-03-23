require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TOKEN;
const ABSTRACT_KEY = process.env.ABSTRACT_KEY;

// 🔥 VALIDACIÓN
if (!token) {
    console.log("❌ TOKEN NO CARGADO");
    process.exit(1);
}

// 🔥 CREAR BOT
const bot = new TelegramBot(token);

// 🔥 ARREGLA EL PROBLEMA REAL (webhook)
bot.deleteWebHook({ drop_pending_updates: true }).then(() => {
    console.log("🧹 Webhook eliminado");
    bot.startPolling();
    console.log("🔥 BOT ENCENDIDO");
});

// ===== TU SISTEMA =====
const usuariosVIP = [8114050673];

// ===== START =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🤖 Bot activo\nUsa /menu");
});

// ===== MENU =====
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📲 MENÚ
═══════════════
💳 /nequi 3001234567
📞 /numero +573001234567
═══════════════
👑 Owner: @Broquicalifoxx
`);
});

// ===== TU COMANDO ORIGINAL (NO TOCADO) =====
bot.onText(/\/nequi (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!usuariosVIP.includes(userId)) {
        return bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
    }

    bot.sendMessage(msg.chat.id, `✅ Número: ${numero}`);
});

// ===== CONSULTA REAL =====
bot.onText(/\/numero (.+)/, async (msg, match) => {
    const userId = msg.from.id;

    if (!usuariosVIP.includes(userId)) {
        return bot.sendMessage(msg.chat.id, "❌ Solo VIP");
    }

    const numero = match[1];
    bot.sendMessage(msg.chat.id, "🔎 Consultando...");

    try {
        const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&phone=${numero}`;
        const res = await axios.get(url);
        const d = res.data;

        bot.sendMessage(msg.chat.id, `
📞 RESULTADO
═══════════════
📱 Número: ${numero}
🌍 País: ${d.country?.name || "N/A"}
📡 Operador: ${d.carrier || "N/A"}
📱 Tipo: ${d.type || "N/A"}
✔️ Válido: ${d.valid}
═══════════════`);
    } catch (err) {
        bot.sendMessage(msg.chat.id, "❌ Error consultando número");
    }
});

// ===== ERROR =====
bot.on("polling_error", (err) => console.log("❌ ERROR:", err.message));