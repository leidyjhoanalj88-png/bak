require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
// IMPORTANTE: Usamos puppeteer-extra-plugin-stealth (es compatible con playwright)
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

// Activar modo sigilo
chromium.use(stealth);

const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.error("❌ ERROR: No se encontró BOT_TOKEN.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process']
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('https://recarga.nequi.com.co/', { waitUntil: 'networkidle', timeout: 60000 });
        
        await page.fill('input#tel-recarga', numero); 
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        await page.click('button#btn-continuar');

        await page.waitForSelector('.nombre-cliente-pago', { timeout: 20000 });
        return await page.innerText('.nombre-cliente-pago');
    } catch (error) {
        console.error("❌ Error Playwright:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

bot.on('text', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return ctx.reply('🚫 No autorizado.');
    const numero = ctx.message.text.trim();
    if (!/^\d{10}$/.test(numero)) return ctx.reply('⚠️ Envía 10 números.');
    
    const msg = await ctx.reply(`⏳ Consultando ${numero}...`);
    const resultado = await consultarNequi(numero);
    
    if (resultado) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, `👤 *Nombre:*\n\`${resultado.trim()}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ Error o número no existe.');
    }
});

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Nequi Vivo');
}).listen(PORT, '0.0.0.0');

bot.launch().then(() => console.log("🚀 Bot conectado."));
