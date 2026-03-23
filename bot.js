require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ===== CONFIG =====
const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const ABSTRACT_KEY = process.env.ABSTRACT_KEY;

if (!TOKEN) {
    console.log("❌ TOKEN NO DEFINIDO");
    process.exit(1);
}

// 🔥 IMPORTANTE: iniciar SIN polling primero
const bot = new TelegramBot(TOKEN, { polling: false });

// 🔥 LIMPIAR CONEXIONES VIEJAS Y ARRANCAR BIEN
async function iniciarBot() {
    try {
        await bot.deleteWebHook({ drop_pending_updates: true });
        await bot.startPolling();

        console.log("🔥 BOT INICIADO LIMPIO");
    } catch (err) {
        console.log("❌ ERROR INICIO:", err.message);
    }
}

iniciarBot();

// ===== ESTADO =====
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
═══════════════════`;
    } catch {
        return "❌ Error consultando número";
    }
}

// 🌐 IP
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
═══════════════════`;
    } catch {
        return "❌ Error validando email";
    }
}

// ===== MIDDLEWARE =====
function verificarActivo(msg) {
    if (!botActivo && msg.from.id != ADMIN_ID) {
        bot.sendMessage(msg.chat.id, "🔴 Bot en mantenimiento");
        return false;
    }
    return true;
}

// ===== COMANDOS =====

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `👋 Hola ${msg.from.first_name}

🤖 BOT ACTIVO

Usa /menu`);
});

bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id, `
📲 MENÚ
═══════════════════
🔍 /numero +573001234567
🌐 /ip 8.8.8.8
📧 /email correo@gmail.com

👑 Owner: @Broquicalifoxx
═══════════════════`);
});

bot.onText(/\/numero (.+)/, async (msg, match) => {
    if (!verificarActivo(msg)) return;
    const res = await consultarNumero(match[1]);
    bot.sendMessage(msg.chat.id, res);
});

bot.onText(/\/ip (.+)/, async (msg, match) => {
    if (!verificarActivo(msg)) return;
    const res = await infoIP(match[1]);
    bot.sendMessage(msg.chat.id, res);
});

bot.onText(/\/email (.+)/, async (msg, match) => {
    if (!verificarActivo(msg)) return;
    const res = await validarEmail(match[1]);
    bot.sendMessage(msg.chat.id, res);
});

// ADMIN
bot.onText(/\/off/, (msg) => {
    if (msg.from.id != ADMIN_ID) return;
    botActivo = false;
    bot.sendMessage(msg.chat.id, "🔴 Bot OFF");
});

bot.onText(/\/on/, (msg) => {
    if (msg.from.id != ADMIN_ID) return;
    botActivo = true;
    bot.sendMessage(msg.chat.id, "🟢 Bot ON");
});

bot.on("polling_error", (err) => console.log("❌ ERROR:", err.message));