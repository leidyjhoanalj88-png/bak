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

// --- FUNCIÓN DE CONSULTA MAESTRA (PSE + DETECCIÓN DE BLOQUEO) ---
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
            hasTouch: true
        });

        const page = await context.newPage();
        
        status = "Entrando a PSE...";
        await page.goto('https://www.psepagos.co/psehostingui/CategoryDetails.aspx?ID=2', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        // Verificación de Bloqueo de IP
        const contenido = await page.content();
        if (contenido.includes("Access Denied") || contenido.includes("Cloudflare")) {
            return { ok: false, error: "IP de Railway Bloqueada por PSE. Usa Localtonet." };
        }

        status = "Buscando campo de celular...";
        // Buscamos cualquier input que sea visible para escribir
        const inputSelector = 'input[type="tel"], input[type="text"], .form-control';
        try {
            await page.waitForSelector(inputSelector, { visible: true, timeout: 15000 });
        } catch (e) {
            return { ok: false, error: "No se encontró el formulario en la página." };
        }

        status = "Escribiendo número...";
        await page.click(inputSelector);
        await page.type(inputSelector, numero, { delay: 150 });
        
        status = "Consultando titular...";
        await page.keyboard.press('Enter'); 
        await page.waitForTimeout(5000); // Espera para que cargue el nombre

        status = "Extrayendo nombre...";
        const resultado = await page.evaluate(() => {
            const body = document.body.innerText;
            // Busca patrones de nombres después de palabras clave típicas de PSE
            const regex = /(?:TITULAR|CLIENTE|NOMBRE|PAGO A:)\s*([A-ZÁÉÍÓÚÑ\s]{10,60})/i;
            const match = body.match(regex);
            return match ? match[0].trim() : null;
        });

        if (resultado) {
            return { ok: true, data: resultado };
        } else {
            return { ok: false, error: "PSE cargó pero no mostró el nombre del titular." };
        }

    } catch (error) { 
        console.error(`Error: ${error.message}`);
        return { ok: false, error: `Fallo en: ${status}` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- COMANDOS DEL BOT ---

bot.start((ctx) => {
    const teclado = ctx.from.id === ADMIN_ID ? 
        Markup.keyboard([['🔍 Realizar Consulta', '🎫 Generar Key'], ['📊 Stats']]).resize() :
        Markup.keyboard([['🔑 Registrar Llave', '👤 Soporte / Comprar']]).resize();
    
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\nBienvenido @${ctx.from.username || 'Admin'}.`, teclado);
});

bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) return ctx.reply("🚫 No tienes acceso.");
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("❌ Uso: `/nequi 3001234567`", { parse_mode: 'Markdown' });

    const numero = args[1].trim();
    if (!/^\d{10}$/.test(numero)) return ctx.reply("⚠️ El número debe ser de 10 dígitos.");

    const espera = await ctx.reply(`⏳ [PSE] Buscando titular de \`${numero}\`...`, { parse_mode: 'Markdown' });
    const res = await consultarNequi(numero);

    if (res.ok) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Resultado:** \n\`${res.data}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `❌ **Error:** ${res.error}`);
    }
});

bot.command('registrar', (ctx) => {
    const key = ctx.message.text.split(' ')[1];
    if (llavesGeneradas.has(key)) {
        llavesGeneradas.delete(key);
        usuariosAutorizados.add(ctx.from.id);
        ctx.reply("✅ Acceso Activado Correctamente.");
    } else {
        ctx.reply("❌ Key inválida.");
    }
});

bot.hears('🎫 Generar Key', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const key = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(key);
    ctx.reply(`🎫 **Key Nueva:** \`${key}\``, { parse_mode: 'Markdown' });
});

bot.hears('📊 Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`📊 Usuarios: ${usuariosAutorizados.size} | Keys: ${llavesGeneradas.size}`);
});

bot.hears('🔍 Realizar Consulta', (ctx) => {
    ctx.reply("Escribe: `/nequi NUMERO`", { parse_mode: 'Markdown' });
});

// Menú Azul
bot.telegram.setMyCommands([
    { command: 'start', description: 'Menú principal' },
    { command: 'nequi', description: 'Consultar número' },
    { command: 'registrar', description: 'Activar Key' }
]);

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Online')).listen(PORT);

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Cash Col Bot Listo"));
