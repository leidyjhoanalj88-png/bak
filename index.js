require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 

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
            // Simular un celular Android real
            userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });

        const page = await context.newPage();

        // Bloquear rastreadores y recursos pesados para no gastar RAM del servidor
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        // PASO 1: Entrar a la Home para generar Cookies de sesión real
        await page.goto('https://www.nequi.com.co/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000); 

        // PASO 2: Ir a la pasarela de recarga
        await page.goto('https://recarga.nequi.com.co/', { waitUntil: 'networkidle', timeout: 40000 });
        
        // PASO 3: Llenar datos con "fill" (más rápido y menos detectable)
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        await page.waitForTimeout(1000);
        
        // PASO 4: Click forzado
        await page.dispatchEvent('button#btn-continuar', 'click');

        // PASO 5: Capturar el nombre
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
        if (browser) await browser.close();
    }
}

bot.command('nequi', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    
    const numero = ctx.message.text.split(' ')[1];
    if (!numero || !/^\d{10}$/.test(numero)) return ctx.reply('❌ Envía un número de 10 dígitos.');

    const espera = await ctx.reply(`⏳ Consultando ${numero}...`);

    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 *Nombre:* \`${resultado}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados.\n\nPosible bloqueo de IP o el número no es Nequi.');
    }
});

bot.launch().then(() => console.log("🚀 Bot Nequi Online"));
require('http').createServer((res) => res.end('OK')).listen(process.env.PORT || 3000);
