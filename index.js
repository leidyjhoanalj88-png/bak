require('dotenv').config(); 
const { Telegraf, Markup } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8114050673; 
const ADMIN_USER = "@Broquicalifoxx"; 

let llavesGeneradas = new Set(); 
let usuariosAutorizados = new Set([ADMIN_ID]); 

// --- FUNCIÓN DE CONSULTA OPTIMIZADA (DISFRAZ IPHONE) ---
async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true, 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled' // Oculta que es un bot
            ] 
        });

        const context = await browser.newContext({ 
            // Usamos tus datos reales de la captura
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            locale: 'es-419',
            timezoneId: 'America/Bogota'
        });

        const page = await context.newPage();
        
        // Bloqueamos imágenes y basura para ahorrar datos del proxy/celular
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());
        
        // Vamos a la web de recarga
        await page.goto('https://recarga.nequi.com.co/recarga-individual', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });

        // Llenado de datos
        await page.type('input#tel-recarga', numero, { delay: 100 });
        await page.type('input#confirm-tel-recarga', numero, { delay: 100 });
        await page.type('input#monto-recarga', '5000', { delay: 100 });
        
        await page.waitForTimeout(1500); 
        await page.click('button#btn-continuar');

        // Esperamos el nombre del titular
        const nombreSelector = '.nombre-cliente-pago';
        try {
            await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 10000 });
            const nombre = await page.innerText(nombreSelector);
            return nombre ? nombre.trim() : null;
        } catch (e) { 
            // Si falla, puede ser bloqueo de IP o número no existe
            return null; 
        }
    } catch (error) { 
        console.error("Error en consulta:", error);
        return null; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- TECLADOS Y COMANDOS (SE MANTIENEN IGUAL) ---
const menuPrincipal = Markup.keyboard([
    ['🔍 Realizar Consulta', '🔑 Registrar Llave'],
    ['👤 Soporte / Comprar']
]).resize();

const menuAdmin = Markup.keyboard([
    ['🔍 Realizar Consulta'],
    ['🎫 Generar Key', '📊 Stats']
]).resize();

bot.start((ctx) => {
    const teclado = ctx.from.id === ADMIN_ID ? menuAdmin : menuPrincipal;
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\n¡Bienvenido @${ctx.from.username}!`, teclado);
});

bot.command('registrar', (ctx) => {
    const texto = ctx.message.text.split(' ');
    if (texto.length < 2) return ctx.reply('❌ Uso: `/registrar TU_LLAVE`');
    const llaveInput = texto[1].trim().toUpperCase();

    if (llavesGeneradas.has(llaveInput)) {
        llavesGeneradas.delete(llaveInput);
        usuariosAutorizados.add(ctx.from.id);
        ctx.reply('✅ ¡Acceso concedido!');
    } else {
        ctx.reply('❌ Llave inválida.');
    }
});

bot.hears('🔍 Realizar Consulta', (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) return ctx.reply(`🚫 Contacta a ${ADMIN_USER}`);
    ctx.reply('🔢 Envía el número de 10 dígitos:');
});

bot.hears('🎫 Generar Key', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const nuevaLlave = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(nuevaLlave);
    ctx.reply(`🎫 Key: \`${nuevaLlave}\``, { parse_mode: 'Markdown' });
});

// --- MANEJO DE NÚMEROS ---
bot.on('text', async (ctx) => {
    const texto = ctx.message.text;
    if (/^\d{10}$/.test(texto)) {
        if (!usuariosAutorizados.has(ctx.from.id)) return;
        
        const espera = await ctx.reply(`⏳ Consultando a Nequi...`);
        const resultado = await consultarNequi(texto);

        if (resultado) {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Titular:** \`${resultado}\``, { parse_mode: 'Markdown' });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ No se pudo obtener el nombre. (Posible bloqueo de IP)');
        }
    }
});

// Servidor y Launch
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('Bot Online'); }).listen(PORT);

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Bot de @Broquicalifoxx Activo"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
