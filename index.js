require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);

// Función para consultar Nequi
async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            viewport: { width: 390, height: 844 },
            isMobile: true
        });

        const page = await context.newPage();
        // Bloqueo de imágenes para ahorrar datos y RAM
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        await page.goto('https://www.nequi.com.co/', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.goto('https://recarga.nequi.com.co/recarga-individual', { waitUntil: 'networkidle', timeout: 30000 });
        
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        await page.waitForTimeout(2500); // Pausa humana
        await page.dispatchEvent('button#btn-continuar', 'click');

        const nombreSelector = '.nombre-cliente-pago';
        try {
            await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 20000 });
            const nombre = await page.innerText(nombreSelector);
            return nombre ? nombre.trim() : null;
        } catch (e) {
            return null;
        }
    } catch (error) {
        console.error("Error:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

// --- COMANDOS DEL BOT ---

// Nuevo comando Start
bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('🚀 **Bot Nequi Activo**\n\nUsa `/nequi 3001234567` para consultar un nombre.', { parse_mode: 'Markdown' });
});

bot.command('nequi', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    
    const numero = ctx.message.text.split(' ')[1];
    if (!numero || !/^\d{10}$/.test(numero)) return ctx.reply('❌ Envía un número de 10 dígitos.');

    const espera = await ctx.reply(`⏳ Consultando ${numero}...`);
    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Nombre:** \`${resultado}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados.\n\nNequi bloqueó la IP o el número no es válido.');
    }
});

// Servidor para que Railway no apague el bot
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Online');
}).listen(PORT, '0.0.0.0');

// Lanzamiento con manejo de errores para evitar el 409 Conflict
bot.launch({ dropPendingUpdates: true })
    .then(() => console.log("🚀 Bot listo con /start y /nequi"))
    .catch(err => console.error("Error al iniciar:", err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
