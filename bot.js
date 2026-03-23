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
    fs.writeFileSync(DB_FILE, JSON.stringify({ datos, usuariosVIP }, null, 2));
}

// 🔹 FUNCIONES
const esAdmin = (id) => admins.includes(id);
const esVIP = (id) => usuariosVIP.includes(id);

const registrarUso = (id) => {
    if (!usoUsuarios[id]) usoUsuarios[id] = 0;
    usoUsuarios[id]++;
};

const getUso = (id) => usoUsuarios[id] || 0;

// 🚀 START
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
`🤖 Sistema activo

🔐 Acceso restringido
📩 Contacta con administración`);
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
/add telefono|nombre|cedula
/edit telefono|nuevoNombre
/del telefono`);
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
    bot.sendMessage(msg.chat.id, "🟢 Sistema activo");
});

// 👑 ADD VIP
bot.onText(/\/addvip (.+)/, (msg, match) => {
    if (!esAdmin(msg.from.id)) return;

    const id = parseInt(match[1]);
    if (!usuariosVIP.includes(id)) {
        usuariosVIP.push(id);
        guardarDB();
        bot.sendMessage(msg.chat.id, "✅ Acceso concedido");
    }
});

// ❌ DEL VIP
bot.onText(/\/delvip (.+)/, (msg, match) => {
    if (!esAdmin(msg.from.id)) return;

    const id = parseInt(match[1]);
    usuariosVIP = usuariosVIP.filter(u => u !== id);
    guardarDB();

    bot.sendMessage(msg.chat.id, "❌ Acceso revocado");
});

// 🔎 VALIDAR
function validarAcceso(msg) {
    if (!BOT_ACTIVO) {
        bot.sendMessage(msg.chat.id, "⛔ Sistema en mantenimiento");
        return false;
    }

    if (!esVIP(msg.from.id)) {
        bot.sendMessage(msg.chat.id,
`❌ Acceso denegado

📩 Contacta con administración`);
        return false;
    }

    if (getUso(msg.from.id) >= 10 && !esAdmin(msg.from.id)) {
        bot.sendMessage(msg.chat.id,
`⚠️ Límite alcanzado

📩 Contacta con administración`);
        return false;
    }

    registrarUso(msg.from.id);
    return true;
}

// 🔎 NEQUI (RESPUESTA PRO REAL)
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
• Verifica el número ingresado
• Intenta con otro número
• Consulta por nombre o cédula (/nombre o /cedula)

🔎 Ejemplo disponible en base:
👤 ${random.nombre}
📱 ${random.telefono}`);
        } else {
            return bot.sendMessage(msg.chat.id,
`❌ Base de datos vacía

📌 No hay información cargada actualmente`);
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
`📋 Información encontrada

👤 ${user.nombre}
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

    const partes = match[1].split("|");

    if (partes.length < 3) {
        return bot.sendMessage(msg.chat.id, "⚠️ Usa: /add tel|nombre|cedula");
    }

    const [telefono, nombre, cedula] = partes;

    datos.push({ telefono, nombre, cedula });
    guardarDB();

    bot.sendMessage(msg.chat.id, "✅ Registro guardado");
});

// ✏️ EDIT
bot.onText(/\/edit (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    const [telefono, nuevoNombre] = match[1].split("|");
    const user = datos.find(d => d.telefono === telefono);

    if (!user) return bot.sendMessage(msg.chat.id, "❌ No encontrado");

    user.nombre = nuevoNombre;
    guardarDB();

    bot.sendMessage(msg.chat.id, "✏️ Registro actualizado");
});

// 🗑️ DEL
bot.onText(/\/del (.+)/, (msg, match) => {
    if (!validarAcceso(msg)) return;

    datos = datos.filter(d => d.telefono !== match[1]);
    guardarDB();

    bot.sendMessage(msg.chat.id, "🗑️ Registro eliminado");
});