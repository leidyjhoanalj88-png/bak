require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ===== BOT =====
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// ===== CONFIG =====
let botActivo = true;

const admins = [8114050673];
const usuariosVIP = [8114050673];

const owner = "@Broquicalifoxx";

// ===== VALIDACIONES =====
const esAdmin = (id) => admins.includes(id);
const esVIP = (id) => usuariosVIP.includes(id);

// ===== CONSULTA NUMERO =====
async function consultarNumero(numero) {
    try {
        const res = await axios.get(
            `https://phonevalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_KEY}&phone=${numero}`
        );

        return {
            pais: res.data.country?.name,
            operador: res.data.carrier,
            tipo: res.data.type,
            valido: res.data.valid
        };

    } catch (e) {
        return { error: true };
    }
}

// ===== IP =====
async function consultarIP(ip) {
    try {
        const res = await axios.get(
            `https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_KEY}&ip_address=${ip}`
        );

        return {
            ciudad: res.data.city,
            vpn: res.data.security?.is_vpn
        };
    } catch {
        return { error: true };
    }
}

// ===== EMAIL =====
async function validarEmail(email) {
    try {
        const res = await axios.get(
            `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_KEY}&email=${email}`
        );

        return res.data.deliverability;
    } catch {
        return "ERROR";
    }
}

// ===== MENU =====
function menuBotones() {
    return {
        reply_markup: {
            keyboard: [
                ["📱 Número", "🌐 IP"],
                ["📧 Email", "⚙️ Estado"]
            ],
            resize_keyboard: true
        }
    };
}

// ===== START =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🤖 BOT ACTIVO

Usa los botones 👇

👑 ${owner}
    `, menuBotones());
});

// ===== MENSAJES =====
bot.on('message', async (msg) => {
    if (!msg.text) return;

    const text = msg.text;
    const userId = msg.from.id;

    // Evitar conflicto con comandos
    if (text.startsWith("/")) return;

    if (!botActivo) return;

    if (!esVIP(userId)) {
        return bot.sendMessage(msg.chat.id, `❌ Solo VIP\n📞 ${owner}`);
    }

    // BOTONES
    if (text === "📱 Número") {
        return bot.sendMessage(msg.chat.id, "Envía el número con +57...");
    }

    if (text === "🌐 IP") {
        return bot.sendMessage(msg.chat.id, "Envía la IP...");
    }

    if (text === "📧 Email") {
        return bot.sendMessage(msg.chat.id, "Envía el correo...");
    }

    if (text === "⚙️ Estado") {
        return bot.sendMessage(msg.chat.id, `🤖 ${botActivo ? "Activo" : "Off"}`);
    }

    // ===== NUMERO =====
    if (text.startsWith("+")) {
        bot.sendMessage(msg.chat.id, "🔍 Consultando...");

        const data = await consultarNumero(text);

        if (data.error) {
            return bot.sendMessage(msg.chat.id, "❌ Sin datos");
        }

        return bot.sendMessage(msg.chat.id, `
📱 RESULTADO

🌍 ${data.pais || "N/A"}
📡 ${data.operador || "N/A"}
📱 ${data.tipo || "N/A"}
✔️ ${data.valido ? "SI" : "NO"}
        `);
    }

    // ===== IP =====
    if (text.split(".").length === 4) {
        const data = await consultarIP(text);

        if (data.error) {
            return bot.sendMessage(msg.chat.id, "❌ Error IP");
        }

        return bot.sendMessage(msg.chat.id, `
🌐 IP

📍 ${data.ciudad}
🛡️ VPN: ${data.vpn ? "SI" : "NO"}
        `);
    }

    // ===== EMAIL =====
    if (text.includes("@")) {
        const estado = await validarEmail(text);

        return bot.sendMessage(msg.chat.id, `
📧 EMAIL

Estado: ${estado}
        `);
    }
});

// ===== ADMIN =====
bot.onText(/\/on/, (msg) => {
    if (!esAdmin(msg.from.id)) return;
    botActivo = true;
    bot.sendMessage(msg.chat.id, "🟢 ON");
});

bot.onText(/\/off/, (msg) => {
    if (!esAdmin(msg.from.id)) return;
    botActivo = false;
    bot.sendMessage(msg.chat.id, "🔴 OFF");
});