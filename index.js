const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('playwright-extra-plugin-stealth')();

// Aplicar el plugin de sigilo
chromium.use(stealth);

// --- CONFIGURACIÓN ---
const BOT_TOKEN = '8180127285:AAF5yfXvj3fT5DkiOSAczCXQx21u4CwNDaA';
const MI_ID_AUTORIZADO = 8114050673; 

const bot = new Telegraf(BOT_TOKEN);

// Función de navegación
async function consultarNequi(numero) {
    console.log(`🔍 Iniciando consulta para: ${numero}`);
    
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            // ARGUMENTOS CRÍTICOS PARA RENDER/DOCKER
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Ayuda a consumir menos RAM en Render
                '--disable-gpu'
            ]
            // proxy: { server: 'http://tu-proxy-colombia.com:port', username: 'user', password: 'pass' }
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale: 'es-CO',
            timezoneId: 'America/Bogota'
        });

        const page = await context.newPage();

        // Tiempo de espera largo para la carga inicial (Nequi a veces es lento)
        await page.goto('https://recarga.nequi.com.co/', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });
        
        // Llenar datos
        await page.fill('input#tel-recarga', numero); 
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        // Click y espera de validación
        await page.click('button#btn-continuar');

        // Esperar el elemento del nombre
        await page.waitForSelector('.nombre-cliente-pago', { timeout: 20000 });
        const nombre = await page.innerText('.nombre-cliente-pago');
        
        return nombre;

    } catch (error) {
        console.error("❌ Error en Playwright:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

// --- COMANDOS TELEGRAM ---

bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('✅ Bot Nequi Activo.\n\nEnvíame un número de 10 dígitos para validar.');
});

bot.on('text', async (ctx) => {
    // Seguridad de ID
    if (ctx.from.id !== MI_ID_AUTORIZADO) {
        return ctx.reply('🚫 No autorizado.');
    }

    const numero = ctx.message.text.trim();

    if (!/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Formato inválido. Deben ser 10 números.');
    }

    const msgEspera = await ctx.reply(`⏳ Buscando a ${numero} en Nequi...`);

    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(ctx.chat.id, msgEspera.message_id, null, `👤 *Nombre:* \`${resultado}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, msgEspera.message_id, null, '❌ No se pudo obtener el nombre.\n\nPosibles causas:\n1. El número no existe.\n2. Nequi bloqueó la IP de Render.\n3. Error de conexión.');
    }
});

// Lanzamiento
bot.launch().then(() => {
    console.log("🚀 Bot en línea para @Broquicalifoxx");
});

// Manejo de apagado (Render lo usa al hacer redeploy)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
