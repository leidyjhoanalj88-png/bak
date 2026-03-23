require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TOKEN;
const ABSTRACT_KEY = process.env.ABSTRACT_KEY;

// 🔥 FIX RAILWAY (NO TOCAR)
const bot = new TelegramBot(token);
bot.deleteWebHook({ drop_pending_updates: true });
bot.startPolling();

// ===== VIP =====
const usuariosVIP = [8114050673];

// ===== START =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `🤖 Bot activo

Usa /menu`);
});

// ===== MENU =====
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📲 MENÚ PRINCIPAL
═══════════════════
🔍 /numero +573001234567
🌐 /ip 8.8.8.8
📧 /email correo@gmail.com
💳 /nequi 3001234567
═══════════════════`);
});

// ===== NEQUI (TU ORIGINAL) =====
bot.onText(/\/nequi (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!usuariosVIP.includes(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    bot.sendMessage(msg.chat.id, `✅ Número: ${numero}`);
});

// ===== CONSULTA NUMERO REAL =====
bot.onText(/\/numero (.+)/, async (msg, match) => {
    if (!usuariosVIP.includes(msg.from.id)) {
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
═══════════════════
📱 Número: ${numero}
🌍 País: ${d.country?.name || "N/A"}
📡 Operador: ${d.carrier || "N/A"}
📶 Tipo: ${d.type || "N/A"}
✔️ Válido: ${d.valid}
═══════════════════`);
    } catch {
        bot.sendMessage(msg.chat.id, "❌ Error en consulta");
    }
});

// ===== IP =====
bot.onText(/\/ip (.+)/, async (msg, match) => {
    if (!usuariosVIP.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "❌ Solo VIP");
    }

    const ip = match[1];

    try {
        const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&ip_address=${ip}`;
        const res = await axios.get(url);
        const d = res.data;

        bot.sendMessage(msg.chat.id, `
🌐 INFO IP
═══════════════════
🌍 País: ${d.country}
🏙️ Ciudad: ${d.city}
📡 ISP: ${d.connection?.isp_name}
🔒 VPN: ${d.security?.is_vpn}
═══════════════════`);
    } catch {
        bot.sendMessage(msg.chat.id, "❌ Error IP");
    }
});

// ===== EMAIL =====
bot.onText(/\/email (.+)/, async (msg, match) => {
    if (!usuariosVIP.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "❌ Solo VIP");
    }

    const email = match[1];

    try {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&email=${email}`;
        const res = await axios.get(url);
        const d = res.data;

        bot.sendMessage(msg.chat.id, `
📧 EMAIL
═══════════════════
📨 ${email}
✔️ Estado: ${d.deliverability}
═══════════════════`);
    } catch {
        bot.sendMessage(msg.chat.id, "❌ Error email");
    }
});

// ===== ERRORES =====
bot.on("polling_error", (err) => {
    console.log("❌ ERROR:", err.message);
});