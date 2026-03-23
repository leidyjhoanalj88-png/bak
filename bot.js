require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const usuariosVIP = [8114050673];

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🤖 Bot activo");
});

bot.onText(/\/nequi (.+)/, (msg, match) => {
    const userId = msg.from.id;
    const numero = match[1];

    if (!usuariosVIP.includes(userId)) {
        bot.sendMessage(msg.chat.id, "❌ Acceso denegado");
        return;
    }

    bot.sendMessage(msg.chat.id, `✅ Número: ${numero}`);
});