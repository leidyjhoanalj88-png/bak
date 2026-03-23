require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID; // tu ID de Telegram
const ABSTRACT_KEY = process.env.ABSTRACT_KEY;

if (!TOKEN) {
    console.log("❌ TOKEN NO DEFINIDO");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: true
});

console.log("🔥 BOT ENCENDIDO");

// ===== ESTADO DEL BOT =====
let botActivo = true;

// ===== FUNCIONES =====

// 📞 CONSULTAR NÚMERO
async function consultarNumero(numero) {
    try {
        const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&phone=${numero}`;
        const res = await axios.get(url);
        const d = res.data;

        return `乄 CONSULTA DE NÚMERO
═══════════════════
📞 Número: ${numero}

🌍 País: ${d.country?.name || "No disponible"}
📡 Operador: ${d.carrier || "No disponible"}
📱 Tipo: ${d.type || "Desconocido"}
✔️ Válido: ${d.valid}

⏱️ Tiempo: rápido
═══════════════════`;
    } catch {
        return "❌ Error consultando número";
    }
}

// 🌐 IP INFO
async function infoIP(ip) {
    try {
        const url = `https://ipgeolocation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&ip_address=${ip}`;
        const res = await axios.get(url);
        const d = res.data;

        return `🌐 INFO IP
═══════════════════
🌍 País: ${d.country}
🏙️ Ciudad: ${d.city}
📡 ISP: ${d.connection?.isp_name}
🔒 VPN: ${d.security?.is_vpn}
═══════════════════`;
    } catch {
        return "❌ Error consultando IP";
    }
}

// 📧 EMAIL
async function validarEmail(email) {
    try {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_KEY}&email=${email}`;
        const res = await axios.get(url);
        const d = res.data;

        return `📧 VALIDACIÓN EMAIL
═══════════════════
📨 Email: ${email}
✔️ Estado: ${d.deliverability}
🔒 Seguro: ${d.is_valid_format?.value}
═══════════════════`;
    } catch {
        return "❌ Error validando email";
    }
}

// ===== MIDDLEWARE =====
function verificarActivo(msg) {
    if (!botActivo && msg.from.id != ADMIN_ID) {
        bot.sendMessage(msg.chat.id, "🔴 Bot en mantenimiento\nContacta al administrador");
        return false;
    }
    return true;
}

// ===== COMANDOS =====

// START
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `👋 Hola ${msg.from.first_name}

🤖 BOT DE CONSULTAS ACTIVO

Usa /menu para ver opciones`);
});

// MENU
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📲 MENÚ PRINCIPAL
═══════════════════
🔍 /numero +573001234567
🌐 /ip 8.8.8.8
📧 /email correo@gmail.com

👑 Owner: @Broquicalifoxx
═══════════════════`);
});

// NUMERO
bot.onText(/\/numero (.+)/, async (msg, match) => {
    if (!verificarActivo(msg)) return;

    const numero = match[1];
    bot.sendMessage(msg.chat.id, "🔎 Consultando...");

    const res = await consultarNumero(numero);
    bot.sendMessage(msg.chat.id, res);
});

// IP
bot.onText(/\/ip (.+)/, async (msg, match) => {
    if (!verificarActivo(msg)) return;

    const ip = match[1];
    bot.sendMessage(msg.chat.id, "🔎 Consultando IP...");

    const res = await infoIP(ip);
    bot.sendMessage(msg.chat.id, res);
});

// EMAIL
bot.onText(/\/email (.+)/, async (msg, match) => {
    if (!verificarActivo(msg)) return;

    const email = match[1];
    bot.sendMessage(msg.chat.id, "🔎 Validando...");

    const res = await validarEmail(email);
    bot.sendMessage(msg.chat.id, res);
});

// ===== ADMIN =====

// APAGAR
bot.onText(/\/off/, (msg) => {
    if (msg.from.id != ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ No eres admin");
    }

    botActivo = false;
    bot.sendMessage(msg.chat.id, "🔴 Bot desactivado");
});

// ENCENDER
bot.onText(/\/on/, (msg) => {
    if (msg.from.id != ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ No eres admin");
    }

    botActivo = true;
    bot.sendMessage(msg.chat.id, "🟢 Bot activado");
});

// ERROR GLOBAL
bot.on("polling_error", (err) => console.log("❌ ERROR:", err.message));