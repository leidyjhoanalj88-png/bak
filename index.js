require('dotenv').config(); 
const { Telegraf, Markup } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8114050673; 
const ADMIN_USER = "@Broquicalifoxx"; 

// Nota: Estos datos se pierden si reinicias el bot.
let llavesGeneradas = new Set(); 
let usuariosAutorizados = new Set([ADMIN_ID]); 

// --- FUNCIÓN DE CONSULTA ---
async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
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
    } catch (error) { 
        console.error("Error en consulta:", error);
        return null; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- TECLADOS ---
const menuPrincipal = Markup.keyboard([
    ['🔍 Realizar Consulta', '🔑 Registrar Llave'],
    ['👤 Soporte / Comprar']
]).resize();

const menuAdmin = Markup.keyboard([
    ['🔍 Realizar Consulta'],
    ['🎫 Generar Key', '📊 Stats']
]).resize();

// --- COMANDOS PRINCIPALES ---

bot.start((ctx) => {
    const teclado = ctx.from.id === ADMIN_ID ? menuAdmin : menuPrincipal;
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\n¡Bienvenido! Selecciona una opción abajo:`, teclado);
});

// Lógica para registrar llave
bot.command('registrar', (ctx) => {
    const texto = ctx.message.text.split(' ');
    if (texto.length < 2) {
        return ctx.reply('❌ Uso correcto: `/registrar TU_LLAVE`', { parse_mode: 'Markdown' });
    }

    const llaveInput = texto[1].trim().toUpperCase();

    if (llavesGeneradas.has(llaveInput)) {
        llavesGeneradas.delete(llaveInput); // La llave es de un solo uso
        usuariosAutorizados.add(ctx.from.id);
        ctx.reply('✅ ¡Llave activada! Ahora tienes acceso completo.', menuPrincipal);
    } else {
        ctx.reply('❌ Llave inválida o ya utilizada. Contacta a soporte.');
    }
});

// --- BOTONES ---

bot.hears('🔍 Realizar Consulta', (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) {
        return ctx.reply(`🚫 No tienes acceso. Contacta a ${ADMIN_USER}`);
    }
    ctx.reply('🔢 Envía el número de 10 dígitos directamente:\n(Ejemplo: `3001234567`)', { parse_mode: 'Markdown' });
});

bot.hears('🔑 Registrar Llave', (ctx) => {
    ctx.reply('Escribe el comando seguido de tu llave:\n\n`/registrar TU_LLAVE`', { parse_mode: 'Markdown' });
});

bot.hears('👤 Soporte / Comprar', (ctx) => {
    ctx.reply(`👤 Contacto oficial: ${ADMIN_USER}`);
});

bot.hears('🎫 Generar Key', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const nuevaLlave = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(nuevaLlave);
    ctx.reply(`✅ Nueva Llave Generada:\n\n\`${nuevaLlave}\``, { parse_mode: 'Markdown' });
});

bot.hears('📊 Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`📊 **Estadísticas**\n\nUsuarios: ${usuariosAutorizados.size}\nKeys activas: ${llavesGeneradas.size}`, { parse_mode: 'Markdown' });
});

// --- MANEJO DE TEXTO (Números y Comandos no definidos) ---

bot.on('text', async (ctx) => {
    const texto = ctx.message.text;

    // Si es un número de 10 dígitos
    if (/^\d{10}$/.test(texto)) {
        if (!usuariosAutorizados.has(ctx.from.id)) {
            return ctx.reply(`🚫 Sin acceso. Compra una llave con ${ADMIN_USER}`);
        }
        
        const espera = await ctx.reply(`⏳ Consultando ${texto}...`);
        const resultado = await consultarNequi(texto);

        if (resultado) {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Nombre:** \`${resultado}\``, { parse_mode: 'Markdown' });
        } else {
            await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados o error en el sistema.');
        }
    }
});

// Configuración de Menú Azul
bot.telegram.setMyCommands([
    { command: 'start', description: 'Abrir Menú Principal' },
    { command: 'registrar', description: 'Activar una llave' }
]);

// Servidor para Keep-Alive
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('Bot Online'); }).listen(PORT, '0.0.0.0');

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Bot Actualizado y Activo"));

// Manejo de errores para evitar que el bot se caiga
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
