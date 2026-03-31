require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

// --- CONFIGURACIÓN DE IDENTIDAD ---
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8114050673; // Tu ID fijo
const ADMIN_USER = "@Broquicalifoxx"; // Tu usuario para soporte

// Base de datos temporal
let llavesGeneradas = new Set(); 
let usuariosAutorizados = new Set([ADMIN_ID]); 

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
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        await page.goto('https://recarga.nequi.com.co/recarga-individual', { waitUntil: 'networkidle', timeout: 30000 });
        
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        await page.waitForTimeout(2500); 
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

// --- MENSAJES DE ERROR ---
const msgNoAcceso = (ctx) => {
    ctx.reply(`🚫 **ACCESO DENEGADO**\n\nNo tienes una suscripción activa.\n\nPara obtener acceso, contacta al administrador:\n👤 **Soporte:** ${ADMIN_USER}`, { parse_mode: 'Markdown' });
};

// --- COMANDOS ---

bot.start((ctx) => {
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\n¡Bienvenido al bot de consultas Nequi!\n\n🔑 **Si tienes una llave:**\nUsa \`/registrar TU_LLAVE\`\n\n👤 **Soporte:** ${ADMIN_USER}`, { parse_mode: 'Markdown' });
});

// COMANDO ADMIN: Generar llaves
bot.command('genkey', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return msgNoAcceso(ctx);
    
    const nuevaLlave = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(nuevaLlave);
    
    ctx.reply(`✅ **Llave Generada:**\n\n\`${nuevaLlave}\`\n\n_Pásala al cliente para su activación._`, { parse_mode: 'Markdown' });
});

// COMANDO ADMIN: Ver usuarios activos
bot.command('users', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`📊 **Estadísticas:**\n\nUsuarios Activos: ${usuariosAutorizados.size}\nLlaves sin usar: ${llavesGeneradas.size}`);
});

// COMANDO USUARIO: Registrarse
bot.command('registrar', (ctx) => {
    const llave = ctx.message.text.split(' ')[1];
    if (!llave) return ctx.reply('❌ Indica la llave. Ejemplo: `/registrar CASH-123XYZ`');
    
    if (llavesGeneradas.has(llave)) {
        usuariosAutorizados.add(ctx.from.id);
        llavesGeneradas.delete(llave);
        ctx.reply('🎉 **¡ACCESO ACTIVADO!**\nYa puedes realizar tus consultas con `/nequi`.');
    } else {
        ctx.reply('❌ La llave es incorrecta o ya fue usada.');
    }
});

// COMANDO CONSULTA (Protegido)
bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) {
        return msgNoAcceso(ctx);
    }
    
    const numero = ctx.message.text.split(' ')[1];
    if (!numero || !/^\d{10}$/.test(numero)) return ctx.reply('❌ Envía un número de 10 dígitos.');

    const espera = await ctx.reply(`⏳ Consultando ${numero}...`);
    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Nombre:** \`${resultado}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados.\nIntenta de nuevo en unos segundos.');
    }
});

// Servidor para Railway
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('CASH COL ONLINE'); }).listen(PORT, '0.0.0.0');

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Cash Col con sistema de acceso activo"));
