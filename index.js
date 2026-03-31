require('dotenv').config(); 
const { Telegraf, Markup } = require('telegraf'); // Importamos Markup
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8114050673; 
const ADMIN_USER = "@Broquicalifoxx"; 

let llavesGeneradas = new Set(); 
let usuariosAutorizados = new Set([ADMIN_ID]); 

// Función de consulta (Se mantiene igual)
async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 13)', isMobile: true });
        const page = await context.newPage();
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());
        await page.goto('https://recarga.nequi.com.co/recarga-individual', { waitUntil: 'networkidle', timeout: 30000 });
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        await page.waitForTimeout(2000); 
        await page.dispatchEvent('button#btn-continuar', 'click');
        const nombreSelector = '.nombre-cliente-pago';
        try {
            await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 15000 });
            const nombre = await page.innerText(nombreSelector);
            return nombre ? nombre.trim() : null;
        } catch (e) { return null; }
    } catch (error) { return null; }
    finally { if (browser) await browser.close(); }
}

// --- TECLADOS (BOTONES) ---
const menuPrincipal = Markup.keyboard([
    ['🔍 Realizar Consulta', '🔑 Registrar Llave'],
    ['👤 Soporte / Comprar']
]).resize();

const menuAdmin = Markup.keyboard([
    ['🔍 Realizar Consulta'],
    ['🎫 Generar Key', '📊 Stats']
]).resize();

// --- COMANDOS ---

bot.start((ctx) => {
    const teclado = ctx.from.id === ADMIN_ID ? menuAdmin : menuPrincipal;
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\n¡Bienvenido! Selecciona una opción abajo:`, teclado);
});

// Escuchar los textos de los botones
bot.hears('🔍 Realizar Consulta', (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) {
        return ctx.reply(`🚫 No tienes acceso. Contacta a ${ADMIN_USER}`);
    }
    ctx.reply('🔢 Envía el número de 10 dígitos directamente:\n(Ejemplo: `3001234567`)', { parse_mode: 'Markdown' });
});

bot.hears('🔑 Registrar Llave', (ctx) => {
    ctx.reply('Escribe: `/registrar TU_LLAVE`', { parse_mode: 'Markdown' });
});

bot.hears('👤 Soporte / Comprar', (ctx) => {
    ctx.reply(`👤 Contacto oficial: ${ADMIN_USER}`);
});

bot.hears('🎫 Generar Key', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const nuevaLlave = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(nuevaLlave);
    ctx.reply(`✅ Llave: \`${nuevaLlave}\``, { parse_mode: 'Markdown' });
});

bot.hears('📊 Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`Usuarios: ${usuariosAutorizados.size}\nKeys: ${llavesGeneradas.size}`);
});

// Lógica para detectar números sueltos (Fluidez total)
bot.on('text', async (ctx) => {
    const texto = ctx.message.text;
    
    // Si es un número de 10 dígitos y está autorizado
    if (/^\d{10}$/.test(texto)) {
        if (!usuariosAutorizados.has(ctx.from.id)) return ctx.reply(`🚫 Sin acceso. Escribe a ${ADMIN_USER}`);
        
        const espera = await ctx.reply(`⏳ Consultando ${texto}...`);
        const resultado = await consultarNequi(texto);

        if (resultado) {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Nombre:** \`${resultado}\``, { parse_mode: 'Markdown' });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados.');
        }
    }
});

// Forzar Menú de comandos azul
bot.telegram.setMyCommands([
    { command: 'start', description: 'Abrir Menú de Botones' }
]);

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('OK'); }).listen(PORT, '0.0.0.0');

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Bot con Botones Activo"));
