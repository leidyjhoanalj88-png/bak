require('dotenv').config();
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ⚙️ CONFIG
let BOT_ACTIVO = true;

const admins = [8114050673];
let usuariosVIP = [8114050673];

let usoUsuarios = {};
let datos = [];
let usuariosRegistrados = new Set();

// 📂 ARCHIVO
const DB_FILE = './db.json';

// 🔄 CARGAR
if (fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE));
    datos = raw.datos || [];
    usuariosVIP = raw.usuariosVIP || usuariosVIP;
}

// 💾 GUARDAR
function guardarDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        datos,
        usuariosVIP
    }, null, 2));
}

// 🔹 FUNCIONES
const esAdmin = (id) => admins.includes(id);
const esVIP = (id) => usuariosVIP.includes(id);

const registrarUso = (id) => {
    if (!usoUsuarios[id]) usoUsuarios[id] = 0;
    usoUsuarios[id]++;
};

const getUso = (id) => usoUsuarios[id] || 0;

// 🧠 VALIDACIÓN PRO
function validarAcceso(msg) {
    const userId = msg.from.id;
    usuariosRegistrados.add(userId);

    // 👑 ADMIN = ACCESO TOTAL
    if (esAdmin(userId)) return true;

    if (!BOT_ACTIVO) {
        bot.sendMessage(msg.chat.id, "⛔ Sistema en mantenimiento");
        return false;
    }

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id,
`❌ Acceso denegado

📩 Contacta con administración`);
        return false;
    }

    if (getUso(userId) >= 10) {
        bot.sendMessage(msg.chat.id,
`⚠️ Límite alcanzado

📩 Contacta con administración`);
        return false;
    }

    registrarUso(userId);
    return true;
}

// 🚀 START
bot.onText(/\/start/, (msg) => {
    usuariosRegistrados.add(msg.from.id);

    bot.sendMessage(msg.chat.id,
`🤖 Sistema activo

🔐 Acceso restringido
📩 Contacta con administración

📋 Usa /menu`);
});

// 📋 MENU
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id,
`📋 COMANDOS

🔎 Consultas:
/nequi numero
/cedula documento
/nombre nombre

🛠️ Gestión:
/add tel|nombre|cedula
/edit tel|nombre
/del tel

👑 Admin:
/panel`);
});

// 🔴 OFF
bot.onText(/\/off/, (msg) => {
    if (!esAdmin(msg.from.id)) return;
    BOT_ACTIVO = false;
    bot.sendMessage(msg.chat.id, "🔴 Sistema desactivado");
});

// 🟢 ON
bot.onText(/\/on/, (msg) => {
    if (!esAdmin(msg.from.id)) return;
    BOT_ACTIVO = true;
    bot.sendMessage(msg.chat.id, "🟢 Sistema activado");
});

// 👑 PANEL ADMIN
bot.onText(/\/panel/, (msg) => {
    if (!esAdmin(msg.from.id)) return;

    bot.sendMessage(msg.chat.id,
`👑 PANEL ADMIN

👥 Usuarios totales: ${usuariosRegistrados.size}
💾 Registros guardados: ${datos.length}
🔐 Usuarios VIP: ${usuariosVIP.length}

📊 Usa:
/stats
/users`);
});

// 📊 STATS
bot.onText(/\/stats/, (msg) => {
    if (!esAdmin(msg.from.id)) return;

    let txt = "📊 USO DE USUARIOS\n\n";

    for (let id in usoUsuarios) {
        txt += `👤 ${id} → ${usoUsuarios[id]} consultas\n`;
    }

    bot.sendMessage(msg.chat.id, txt || "Sin datos");
});

// 👥 USERS
bot.onText(/\/users/, (msg) => {
    if (!esAdmin(msg.from.id)) return;

    let txt = "👥 USUARIOS:\n\n";
    usuariosRegistrados.forEach(id => {
        txt += `🆔 ${id}\n`;
    });

    bot.sendMessage(msg.chat.id, txt);
});

// 👑 ADD VIP
bot.onText(/\/addvip (.+)/, (msg, match) => {
    if (!esAdmin(msg.from.id)) return;

    const id = parseInt(match[1]);
    if (!usuariosVIP.includes(id)) {
        usuariosVIP.push(id);
        guardarDB();
        bot.sendMessage(msg.chat.id, "✅ VIP agregado");
    }
});

// ❌ DEL VIP
bot.onText(/\/delvip (.+)/, (msg, match) => {
    if (!esAdmin(msg.from.id)) return;

    const id = parseInt(match[1]);
    usuariosVIP = usuariosVIP.filter(u => u !== id);
    guardarDB();

    bot.sendMessage(msg.chat.id, "❌ VIP eliminado");
});

// 🔎 NEQUI PRO
bot.onText(/\/nequi (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    const numero = match[1];
    const user = datos.find(d => d.telefono === numero);

    if (!user) {
        if (datos.length > 0) {
            const random = datos[Math.floor(Math.random() * datos.length)];

            return bot.sendMessage(msg.chat.id,
`❌ Sin resultados para este número

📌 No se encontró información asociada

💡 Sugerencias:
• Verifica el número
• Usa /nombre
• Usa /cedula

🔎 Ejemplo:
👤 ${random.nombre}
📱 ${random.telefono}`);
        } else {
            return bot.sendMessage(msg.chat.id, "❌ Base vacía");
        }
    }

    bot.sendMessage(msg.chat.id,
`📋 Información encontrada

👤 ${user.nombre}
🆔 ${user.cedula}
📱 ${user.telefono}`);
});

// 🔎 CEDULA
bot.onText(/\/cedula (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    const user = datos.find(d => d.cedula === match[1]);
    if (!user) return bot.sendMessage(msg.chat.id, "❌ Sin resultados");

    bot.sendMessage(msg.chat.id,
`👤 ${user.nombre}
📱 ${user.telefono}
🆔 ${user.cedula}`);
});

// 🔎 NOMBRE
bot.onText(/\/nombre (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    const nombre = match[1].toLowerCase();
    const resultados = datos.filter(d => d.nombre.toLowerCase().includes(nombre));

    if (!resultados.length) return bot.sendMessage(msg.chat.id, "❌ Sin resultados");

    let txt = "📋 Resultados:\n\n";
    resultados.forEach(u => {
        txt += `👤 ${u.nombre}\n📱 ${u.telefono}\n🆔 ${u.cedula}\n\n`;
    });

    bot.sendMessage(msg.chat.id, txt);
});

// ➕ ADD
bot.onText(/\/add (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    const [telefono, nombre, cedula] = match[1].split("|");

    if (!telefono || !nombre || !cedula) {
        return bot.sendMessage(msg.chat.id, "⚠️ Formato: /add tel|nombre|cedula");
    }

    datos.push({ telefono, nombre, cedula });
    guardarDB();

    bot.sendMessage(msg.chat.id, "✅ Guardado");
});

// ✏️ EDIT
bot.onText(/\/edit (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    const [telefono, nuevoNombre] = match[1].split("|");
    const user = datos.find(d => d.telefono === telefono);

    if (!user) return bot.sendMessage(msg.chat.id, "❌ No encontrado");

    user.nombre = nuevoNombre;
    guardarDB();

    bot.sendMessage(msg.chat.id, "✏️ Actualizado");
});

// 🗑️ DEL
bot.onText(/\/del (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    datos = datos.filter(d => d.telefono !== match[1]);
    guardarDB();

    bot.sendMessage(msg.chat.id, "🗑️ Eliminado");
});