require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

// Activar modo sigilo
chromium.use(stealth);

// Configuración
const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.error("❌ ERROR: No se encontró BOT_TOKEN.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Función de Scraping
async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage', 
                '--single-process',
                '--disable-gpu'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();
        
        // Navegar a Nequi
        await page.goto('https://recarga.nequi.com.co/', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });
        
        await page.fill('input#tel-recarga', numero); 
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        await page.waitForTimeout(1000); // Pequeña pausa humana
        await page.click('button#btn-continuar');

        // Esperar el nombre (Aumentamos el tiempo a 30s)
        await page.waitForSelector('.nombre-cliente-pago', { timeout: 30000 });
        const nombre = await page.innerText('.nombre-cliente-pago');
        
        return nombre;
    } catch (error) {
        console.error("❌ Error en la consulta:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

// Lógica de Telegram
bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('✅ Bot Nequi en línea.\n\nUso: /nequi 3217326803');
});

bot.command('nequi', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return ctx.reply('🚫 No autorizado.');

    const args = ctx.message.text.split(' ');
    const numero = args[1] ? args[1].trim() : null;

    if (!numero || !/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Formato incorrecto.\nEjemplo: /nequi 3217326803');
    }

    const msgEspera = await ctx.reply(`⏳ Consultando ${numero}...`);

    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            msgEspera.message_id, 
            null, 
            `👤 *Nombre:* \`${resultado.trim()}\``, 
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            msgEspera.message_id, 
            null, 
            '❌ No se pudo obtener el nombre.\nPosible bloqueo o número sin Nequi.'
        );
    }
});

// Servidor para que Railway/Render no apaguen el bot
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Nequi Activo');
}).listen(PORT, '0.0.0.0');

bot.launch().then(() => console.log("🚀 Bot conectado con éxito."));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
