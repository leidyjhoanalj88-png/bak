require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.MI_ID_AUTORIZADO); // Tu ID sigue siendo el admin

// Base de datos temporal (Se borra si el bot se reinicia)
let llavesGeneradas = new Set(); 
let usuariosAutorizados = new Set([ADMIN_ID]); // Tú siempre estás autorizado

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

// --- COMANDOS ---

bot.start((ctx) => {
    ctx.reply(`👋 ¡Bienvenido a Cash Col!\n\n🔑 Si tienes una llave, usa: \`/registrar TU_LLAVE\`\n🔍 Si ya estás activo, usa: \`/nequi 3001234567\``, { parse_mode: 'Markdown' });
});

// COMANDO PARA EL ADMIN: Generar llaves
bot.command('genkey', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    
    const nuevaLlave = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(nuevaLlave);
    
    ctx.reply(`✅ **Llave Generada:**\n\n\`${nuevaLlave}\`\n\nEnvíala al cliente para que se registre.`, { parse_mode: 'Markdown' });
});

// COMANDO PARA EL USUARIO: Registrarse con llave
bot.command('registrar', (ctx) => {
    const llave = ctx.message.text.split(' ')[1];
    
    if (!llave) return ctx.reply('❌ Debes poner la llave. Ejemplo: `/registrar CASH-123XYZ`');
    
    if (llavesGeneradas.has(llave)) {
        usuariosAutorizados.add(ctx.from.id);
        llavesGeneradas.delete(llave); // La llave es de un solo uso
        ctx.reply('🎉 **¡Acceso Concedido!**\nAhora puedes usar el comando `/nequi`.');
    } else {
        ctx.reply('❌ Llave inválida o ya utilizada.');
    }
});

// COMANDO CONSULTA (Protegido)
bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) {
        return ctx.reply('🚫 No tienes acceso. Compra una llave con el administrador.');
    }
    
    const numero = ctx.message.text.split(' ')[1];
    if (!numero || !/^\d{10}$/.test(numero)) return ctx.reply('❌ Envía un número de 10 dígitos.');

    const espera = await ctx.reply(`⏳ Consultando ${numero}...`);
    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Nombre:** \`${resultado}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, '❌ Sin resultados o IP bloqueada.');
    }
});

// Server para Railway
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.end('OK'); }).listen(PORT, '0.0.0.0');

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Bot Cash Col Online"));
