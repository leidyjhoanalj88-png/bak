require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http'); // Importamos http correctamente

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);

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
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });

        const page = await context.newPage();
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        await page.goto('https://www.nequi.com.co/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000); 

        await page.goto('https://recarga.nequi.com.co/', { waitUntil: 'networkidle', timeout: 40000 });
        
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        await page.waitForTimeout(1000);
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
        console.error("Error Proceso:", error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

bot.command('nequi', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    
    const args = ctx.message.text.split(' ');
    const numero = args[1];
    
    if (!numero || !/^\d{10}$/.test(numero)) {
        return ctx.reply('❌ Envía un número de 10 dígitos. Ejemplo: /nequi 3001234567');
    }

    const espera = await ctx.reply(`⏳ Consultando ${numero}...`);

    try {
        const resultado = await consultarNequi(numero);
        if (resultado) {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 *Nombre:* \`${resultado}\``, { parse_mode: 'Markdown' });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados.\n\nPosible bloqueo de IP o el número no es Nequi.');
        }
    } catch (err) {
        console.error(err);
        ctx.reply('❌ Ocurrió un error en el servidor.');
    }
});

// --- CORRECCIÓN AQUÍ ---
// Railway necesita que el servidor responda a las peticiones para marcar el bot como "saludable"
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Online');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor web activo en puerto ${PORT}`);
});

bot.launch()
    .then(() => console.log("🚀 Bot Nequi conectado exitosamente"))
    .catch((err) => console.error("Error al iniciar bot:", err));

// Manejo de cierre limpio
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
