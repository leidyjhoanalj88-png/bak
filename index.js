require('dotenv').config(); // <-- Corregido: r minúscula
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('playwright-extra-plugin-stealth')();
const http = require('http');

// Activar modo sigilo para Playwright
chromium.use(stealth);

// --- CONFIGURACIÓN DESDE VARIABLES DE ENTORNO ---
const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
    console.error("❌ ERROR: No se encontró BOT_TOKEN en el archivo .env o en las variables de Render.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- FUNCIÓN DE SCRAPING (NEQUI) ---
async function consultarNequi(numero) {
    console.log(`🔍 Iniciando consulta para: ${numero}`);
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
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale: 'es-CO',
            timezoneId: 'America/Bogota'
        });

        const page = await context.newPage();

        // Ir a la página de recargas
        await page.goto('https://recarga.nequi.com.co/', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });
        
        // Llenar el formulario
        await page.fill('input#tel-recarga', numero); 
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        // Click en continuar
        await page.click('button#btn-continuar');

        // Esperar a que el nombre aparezca en el DOM
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

// --- LÓGICA DE TELEGRAM ---

bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('✅ Bot Nequi activo para @Broquicalifoxx.\n\nEnvíame un número de 10 dígitos para consultar.');
});

bot.on('text', async (ctx) => {
    // Filtro de seguridad por ID
    if (ctx.from.id !== MI_ID_AUTORIZADO) {
        return ctx.reply('🚫 No tienes autorización para usar este bot.');
    }

    const numero = ctx.message.text.trim();

    // Validar que sean 10 dígitos numéricos
    if (!/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Formato incorrecto. Envía exactamente 10 números.');
    }

    const msgEspera = await ctx.reply(`⏳ Consultando a ${numero} en Nequi...`);

    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            msgEspera.message_id, 
            null, 
            `👤 *Nombre Encontrado:*\n\n\`${resultado.trim()}\``, 
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            msgEspera.message_id, 
            null, 
            '❌ No se pudo obtener el nombre.\n\nPosible bloqueo de Nequi o número inexistente.'
        );
    }
});

// --- SERVIDOR HTTP (PARA RENDER) ---
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Nequi Operativo');
}).listen(PORT, () => {
    console.log(`🌍 Servidor web escuchando en puerto ${PORT}`);
});

// --- INICIO DEL BOT ---
bot.launch().then(() => {
    console.log("🚀 Bot de Telegram conectado correctamente.");
});

// Manejo de señales para apagado limpio
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
