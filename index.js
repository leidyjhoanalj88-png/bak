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

// --- FUNCIÓN DE CONSULTA POR PSE (LA RUTA QUE NO BLOQUEA) ---
async function consultarNequi(numero) {
    let browser;
    let status = "Iniciando...";
    try {
        browser = await chromium.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });

        const context = await browser.newContext({ 
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true,
            locale: 'es-419',
            timezoneId: 'America/Bogota'
        });

        const page = await context.newPage();
        
        // Bloqueamos multimedia para que cargue rápido en Railway
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        status = "Entrando a PSE...";
        await page.goto('https://www.psepagos.co/psehostingui/CategoryDetails.aspx?ID=2', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });

        status = "Llenando número en PSE...";
        // Buscamos el campo de texto donde se pone el celular
        const inputSelector = 'input[type="tel"], input[name*="celular"], .form-control';
        await page.waitForSelector(inputSelector, { timeout: 20000 });
        await page.fill(inputSelector, numero);
        
        status = "Consultando titular...";
        await page.keyboard.press('Enter'); 

        // Esperamos a que la página reaccione
        await page.waitForTimeout(4000); 

        status = "Buscando nombre en respuesta...";
        const nombreEncontrado = await page.evaluate(() => {
            // Buscamos palabras clave en la pantalla que suelen acompañar al nombre
            const bodyText = document.body.innerText;
            const lineas = bodyText.split('\n');
            for (let linea of lineas) {
                if (linea.includes('Titular') || linea.includes('Nombre') || linea.includes('CLIENTE')) {
                    return linea.trim();
                }
            }
            return null;
        });

        if (nombreEncontrado) {
            return { ok: true, data: nombreEncontrado };
        } else {
            return { ok: false, error: "PSE no mostró el nombre directamente." };
        }

    } catch (error) { 
        console.error(`Error en fase [${status}]:`, error.message);
        return { ok: false, error: `Fallo en: ${status}` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- CONFIGURACIÓN DE COMANDOS ---

bot.start((ctx) => {
    const menu = ctx.from.id === ADMIN_ID ? 
        Markup.keyboard([['🔍 Consulta Rápida', '🎫 Generar Key'], ['📊 Stats']]).resize() :
        Markup.keyboard([['🔑 Registrar Llave', '👤 Soporte']]).resize();
    
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\nBienvenido @${ctx.from.username || 'Usuario'}.`, menu);
});

// NUEVO COMANDO SOLICITADO
bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) return ctx.reply("🚫 No tienes acceso.");
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("❌ Uso: `/nequi 3001234567`", { parse_mode: 'Markdown' });

    const numero = args[1].trim();
    if (!/^\d{10}$/.test(numero)) return ctx.reply("⚠️ El número debe ser de 10 dígitos.");

    const espera = await ctx.reply(`⏳ [PSE] Consultando \`${numero}\`...`, { parse_mode: 'Markdown' });
    const res = await consultarNequi(numero);

    if (res.ok) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Resultado:** \n\`${res.data}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `❌ **Error:** ${res.error}`);
    }
});

// Comandos del Menú Azul
bot.telegram.setMyCommands([
    { command: 'start', description: 'Abrir Menú' },
    { command: 'nequi', description: 'Consulta (Ej: /nequi 3001234567)' },
    { command: 'registrar', description: 'Activar Key' }
]);

// --- LÓGICA DE LLAVES (ADMIN) ---
bot.hears('🎫 Generar Key', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const key = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(key);
    ctx.reply(`🎫 Key Generada: \`${key}\``, { parse_mode: 'Markdown' });
});

bot.command('registrar', (ctx) => {
    const key = ctx.message.text.split(' ')[1];
    if (llavesGeneradas.has(key)) {
        llavesGeneradas.delete(key);
        usuariosAutorizados.add(ctx.from.id);
        ctx.reply("✅ Acceso Activado.");
    } else {
        ctx.reply("❌ Key inválida.");
    }
});

// Servidor para Railway
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Online')).listen(PORT);

bot.launch().then(() => console.log("🚀 Bot Actualizado con PSE y /nequi"));
