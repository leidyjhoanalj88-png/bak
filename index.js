require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);

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
                '--disable-blink-features=AutomationControlled' // Oculta que es un bot
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });

        const page = await context.newPage();
        
        // Ir a Nequi con tiempo de espera largo
        await page.goto('https://recarga.nequi.com.co/', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });
        
        // Simular escritura humana
        await page.type('input#tel-recarga', numero, { delay: 100 }); 
        await page.type('input#confirm-tel-recarga', numero, { delay: 120 });
        await page.type('input#monto-recarga', '5000', { delay: 150 });
        
        await page.waitForTimeout(1500); // Pausa realista
        
        // Click en continuar
        await page.click('button#btn-continuar');

        // ESPERA CRÍTICA: Esperamos a que el selector aparezca O que pase el tiempo
        // Nequi a veces muestra un esqueleto de carga antes del nombre
        const nombreSelector = '.nombre-cliente-pago';
        await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 35000 });
        
        const nombre = await page.innerText(nombreSelector);
        
        if (!nombre || nombre.trim().length < 2) {
            console.log("⚠️ Nombre vacío o no encontrado en el DOM");
            return null;
        }

        return nombre.trim();

    } catch (error) {
        console.error("❌ Error en Playwright:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('✅ Bot Nequi Activo.\n\nUso: /nequi 3217326803');
});

bot.command('nequi', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return ctx.reply('🚫 No autorizado.');

    const args = ctx.message.text.split(' ');
    const numero = args[1] ? args[1].trim() : null;

    if (!numero || !/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Formato incorrecto.\nEjemplo: /nequi 3217326803');
    }

    const msgEspera = await ctx.reply(`⏳ Consultando ${numero}...`);

    try {
        const resultado = await consultarNequi(numero);

        if (resultado) {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                msgEspera.message_id, 
                null, 
                `👤 *Nombre Encontrado:*\n\n\`${resultado}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                msgEspera.message_id, 
                null, 
                '❌ No se pudo obtener el nombre.\n\nNequi podría estar bloqueando la consulta o el número no tiene cuenta activa.'
            );
        }
    } catch (e) {
        ctx.reply('❌ Error interno del bot.');
    }
});

http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Servidor Bot Nequi OK');
}).listen(PORT, '0.0.0.0');

bot.launch().then(() => console.log("🚀 Bot conectado."));
