require('dotenv').config();
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('playwright-extra-plugin-stealth')();
const http = require('http');

// Activar sigilo
chromium.use(stealth);

const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.error("❌ ERROR: Falta BOT_TOKEN");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

async function consultarNequi(numero) {
    console.log(`🔍 Consultando: ${numero}`);
    let browser;
    
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });

        const page = await context.newPage();

        // --- OPTIMIZACIÓN: Bloquear recursos pesados ---
        await page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,pdf}', (route) => route.abort());

        await page.goto('https://recarga.nequi.com.co/', { 
            waitUntil: 'domcontentloaded', 
            timeout: 40000 
        });
        
        // Esperar e interactuar
        await page.waitForSelector('input#tel-recarga');
        await page.type('input#tel-recarga', numero, { delay: 50 }); 
        await page.type('input#confirm-tel-recarga', numero, { delay: 50 });
        await page.type('input#monto-recarga', '5000');
        
        await page.click('button#btn-continuar');

        // Esperar nombre o mensaje de error
        const res = await Promise.race([
            page.waitForSelector('.nombre-cliente-pago', { timeout: 15000 }).then(() => 'success'),
            page.waitForSelector('.error-msg, [role="alert"]', { timeout: 15000 }).then(() => 'not_found')
        ]);

        if (res === 'success') {
            const nombre = await page.innerText('.nombre-cliente-pago');
            return { ok: true, data: nombre.trim() };
        } else {
            return { ok: false, msg: 'Número no registrado o error en Nequi.' };
        }

    } catch (error) {
        console.error("❌ Detalle:", error.message);
        return { ok: false, msg: 'Error de conexión o bloqueo de plataforma.' };
    } finally {
        if (browser) await browser.close();
    }
}

// --- TELEGRAM LOGIC ---

bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('🚀 Bot Nequi Actualizado.\nEnvíame un número de 10 dígitos.');
});

bot.on('text', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;

    const numero = ctx.message.text.trim();
    if (!/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Formato inválido. Deben ser 10 números.');
    }

    const { message_id } = await ctx.reply(`⏳ Buscando a ${numero}...`);

    const resultado = await consultarNequi(numero);

    if (resultado.ok) {
        await ctx.telegram.editMessageText(ctx.chat.id, message_id, null, 
            `✅ *Resultado:*\n\n👤 \`${resultado.data}\``, 
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, message_id, null, `❌ ${resultado.msg}`);
    }
});

// --- SERVER PARA RENDER ---
http.createServer((req, res) => {
    res.write('Bot Vivo');
    res.end();
}).listen(PORT);

bot.launch().then(() => console.log("✅ Bot en línea"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
