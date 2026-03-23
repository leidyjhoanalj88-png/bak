require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TOKEN;
const ABSTRACT_KEY = process.env.ABSTRACT_KEY;

// 🔥 TU FORMA ORIGINAL (NO LA TOCO)
const bot = new TelegramBot(token, { polling: true });

const usuariosVIP = [8114050673];

// ===== TU START ORIGINAL =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🤖 Bot activo");
});

// ===== TU COMANDO ORIGINAL (NO TOCADO) =====
bot.onText(/\/nequi (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!usuariosVIP.includes(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    bot.sendMessage(msg.chat.id, `✅ Número: ${numero}`);
});


// =============================
// 🔥 SOLO AGREGO DESDE AQUÍ
// =============================

// MENU
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📲 MENÚ
═══════════════
💳 /nequi 3001234567
📞 /numero +573001234567
🌐 /ip 8.8.8.8
📧 /email correo@gmail.com
═══════════════`);
});

// CONSULTA NÚMERO
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
✔️ Válido: ${d.valid}
═══════════════`);
    } catch {
        bot.sendMessage(msg.chat.id, "❌ Error consultando número");
    }
});

// IP
bot.onText(/\/ip (.+)/, async (msg, match) => {
    const ip = match[1];
    bot.sendMessage(msg.chat.id, "🔎 Consultando IP...");

    try {
        const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&ip_address=${ip}`;
        const res = await axios.get(url);
        const d = res.data;

        bot.sendMessage(msg.chat.id, `
🌐 INFO IP
═══════════════
🌍 País: ${d.country}
🏙️ Ciudad: ${d.city}
🔒 VPN: ${d.security?.is_vpn}
═══════════════`);
    } catch {
        bot.sendMessage(msg.chat.id, "❌ Error IP");
    }
});

// EMAIL
bot.onText(/\/email (.+)/, async (msg, match) => {
    const email = match[1];
    bot.sendMessage(msg.chat.id, "🔎 Validando email...");

    try {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&email=${email}`;
        const res = await axios.get(url);
        const d = res.data;

        bot.sendMessage(msg.chat.id, `
📧 EMAIL
═══════════════
📨 ${email}
✔️ Estado: ${d.deliverability}
═══════════════`);
    } catch {
        bot.sendMessage(msg.chat.id, "❌ Error email");
    }
});

// ERROR
bot.on("polling_error", (err) => console.log("❌ ERROR:", err.message));