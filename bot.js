require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

// 🔐 Usuarios VIP
const usuariosVIP = [8114050673];

// 🧠 Base de datos temporal (luego la pasamos a JSON o Mongo)
let datos = [];

// /start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🤖 Bot activo\nUsa /menu para ver comandos");
});

// 📋 Menú
bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(msg.chat.id,
`📋 COMANDOS

/nequi numero
/cedula documento
/nombre nombre

/add telefono|nombre|cedula
/edit telefono|nuevoNombre
/del telefono`);
});

// 🔐 Verificación VIP
function esVIP(userId) {
    return usuariosVIP.includes(userId);
}

// 🔎 CONSULTAR POR TELÉFONO
bot.onText(/\/nequi (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    const user = datos.find(d => d.telefono === numero);

    if (!user) {
        bot.sendMessage(msg.chat.id, "❌ No encontrado");
        return;
    }

    bot.sendMessage(msg.chat.id,
`📋 Información de Nequi

👤 Nombre: ${user.nombre}
🆔 Cédula: ${user.cedula}
📱 Teléfono: ${user.telefono}`);
});

// 🔎 CONSULTAR POR CÉDULA
bot.onText(/\/cedula (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const cedula = match[1];

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    const user = datos.find(d => d.cedula === cedula);

    if (!user) {
        bot.sendMessage(msg.chat.id, "❌ No encontrado");
        return;
    }

    bot.sendMessage(msg.chat.id,
`📋 Información

👤 Nombre: ${user.nombre}
📱 Teléfono: ${user.telefono}
🆔 Cédula: ${user.cedula}`);
});

// 🔎 BUSCAR POR NOMBRE
bot.onText(/\/nombre (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const nombre = match[1].toLowerCase();

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    const resultados = datos.filter(d => d.nombre.toLowerCase().includes(nombre));

    if (resultados.length === 0) {
        bot.sendMessage(msg.chat.id, "❌ No encontrado");
        return;
    }

    let respuesta = "📋 Resultados:\n\n";
    resultados.forEach(u => {
        respuesta += `👤 ${u.nombre}\n📱 ${u.telefono}\n🆔 ${u.cedula}\n\n`;
    });

    bot.sendMessage(msg.chat.id, respuesta);
});

// ➕ AGREGAR DATOS
bot.onText(/\/add (.+)/, (msg, match) => {
    const userId = msg.from.id;

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    const [telefono, nombre, cedula] = match[1].split("|");

    datos.push({ telefono, nombre, cedula });

    bot.sendMessage(msg.chat.id, "✅ Datos guardados");
});

// ✏️ EDITAR
bot.onText(/\/edit (.+)/, (msg, match) => {
    const userId = msg.from.id;

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    const [telefono, nuevoNombre] = match[1].split("|");

    const user = datos.find(d => d.telefono === telefono);

    if (!user) {
        bot.sendMessage(msg.chat.id, "❌ No encontrado");
        return;
    }

    user.nombre = nuevoNombre;

    bot.sendMessage(msg.chat.id, "✏️ Actualizado");
});

// 🗑️ ELIMINAR
bot.onText(/\/del (.+)/, (msg, match) => {
    const userId = msg.from.id;

    if (!esVIP(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    const telefono = match[1];

    datos = datos.filter(d => d.telefono !== telefono);

    bot.sendMessage(msg.chat.id, "🗑️ Eliminado");
});