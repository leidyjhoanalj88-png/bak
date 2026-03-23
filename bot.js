require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// ===== BOT =====
const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// ===== DB =====
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ===== CONFIG =====
let botActivo = true;

const admins = [8114050673];
const usuariosVIP = [8114050673];

const owner = "@Broquicalifoxx";

// ===== FUNCIONES =====
const esAdmin = (id) => admins.includes(id);
const esVIP = (id) => usuariosVIP.includes(id);

// ===== LOGS =====
async function log(user, accion, resultado) {
    try {
        await supabase.from("logs_consultas").insert([
            { user_id: user, action: accion, status: "OK", details: resultado }
        ]);
    } catch {}
}

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
            valido: res.data.valid,
            fuente: "Abstract"
        };

    } catch {
        try {
            const res = await axios.get(
                `https://api.numlookupapi.com/v1/validate/${numero}?apikey=${process.env.NUMLOOKUP_KEY}`
            );

            return {
                pais: res.data.country_name,
                operador: res.data.carrier,
                tipo: res.data.line_type,
                valido: res.data.valid,
                fuente: "Numlookup"
            };
        } catch {
            return { error: true };
        }
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
╔════════════════════╗
   🤖 PANEL CONSULTAS
╚════════════════════╝

🌍 Sistema activo

👇 Usa los botones

━━━━━━━━━━━━━━━━━━━
👑 Owner: ${owner}
    `, menuBotones());
});

// ===== MENSAJES =====
bot.on('message', async (msg) => {
    const text = msg.text;
    const userId = msg.from.id;

    if (!botActivo) return;

    if (!esVIP(userId)) {
        return bot.sendMessage(msg.chat.id, `❌ Solo VIP\n📞 ${owner}`);
    }

    // BOTONES
    if (text === "📱 Número") {
        return bot.sendMessage(msg.chat.id, "📱 Envía el número con +57...");
    }

    if (text === "🌐 IP") {
        return bot.sendMessage(msg.chat.id, "🌐 Envía la IP...");
    }

    if (text === "📧 Email") {
        return bot.sendMessage(msg.chat.id, "📧 Envía el correo...");
    }

    if (text === "⚙️ Estado") {
        return bot.sendMessage(msg.chat.id, `
⚙️ ESTADO

🤖 Bot: ${botActivo ? "🟢 ACTIVO" : "🔴 OFF"}
👑 VIP: ${usuariosVIP.length}
🛡️ Admin: ${admins.length}

━━━━━━━━━━━━━━━━━━━
👑 Owner: ${owner}
        `);
    }

    // ===== NUMERO =====
    if (text.startsWith("+")) {
        bot.sendMessage(msg.chat.id, "🔍 Consultando número...");

        const data = await consultarNumero(text);

        const res = data.error ? `
❌ SIN RESULTADO

🔢 ${text}

💡 Intenta otro número
        ` : `
╔════════════════════╗
   📱 RESULTADO
╚════════════════════╝

🔢 ${text}
🌍 ${data.pais || "N/A"}
📡 ${data.operador || "N/A"}
📱 ${data.tipo || "N/A"}
✔️ ${data.valido ? "SI" : "NO"}

📊 ${data.fuente}
        `;

        bot.sendMessage(msg.chat.id, res);
        log(userId, "numero", text);
    }

    // ===== IP =====
    else if (text.split(".").length === 4) {
        bot.sendMessage(msg.chat.id, "🔍 Consultando IP...");

        const data = await consultarIP(text);

        const res = data.error ? "❌ Error IP" : `
🌐 RESULTADO IP

📍 Ciudad: ${data.ciudad}
🛡️ VPN: ${data.vpn ? "SI ⚠️" : "NO"}
        `;

        bot.sendMessage(msg.chat.id, res);
        log(userId, "ip", text);
    }

    // ===== EMAIL =====
    else if (text.includes("@")) {
        bot.sendMessage(msg.chat.id, "🔍 Validando email...");

        const estado = await validarEmail(text);

        bot.sendMessage(msg.chat.id, `
📧 RESULTADO EMAIL

📨 ${text}
📊 Estado: ${estado}
        `);

        log(userId, "email", text);
    }
});

// ===== ADMIN =====
bot.onText(/\/on/, (msg) => {
    if (!esAdmin(msg.from.id)) return;
    botActivo = true;
    bot.sendMessage(msg.chat.id, "🟢 BOT ACTIVADO");
});

bot.onText(/\/off/, (msg) => {
    if (!esAdmin(msg.from.id)) return;
    botActivo = false;
    bot.sendMessage(msg.chat.id, "🔴 BOT APAGADO");
});

bot.onText(/\/addvip (.+)/, (msg, match) => {
    if (!esAdmin(msg.from.id)) return;

    const id = parseInt(match[1]);
    if (!usuariosVIP.includes(id)) usuariosVIP.push(id);

    bot.sendMessage(msg.chat.id, "✅ VIP agregado");
});

bot.onText(/\/delvip (.+)/, (msg, match) => {
    if (!esAdmin(msg.from.id)) return;

    const id = parseInt(match[1]);
    const index = usuariosVIP.indexOf(id);

    if (index !== -1) usuariosVIP.splice(index, 1);

    bot.sendMessage(msg.chat.id, "🗑️ VIP eliminado");
});