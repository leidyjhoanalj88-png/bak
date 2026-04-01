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

// --- FUNCIÓN DE CONSULTA CON LOG DE ERRORES ---
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
            isMobile: true,
            hasTouch: true
        });

        const page = await context.newPage();
        
        // PASO 1: Verificar conexión e IP
        status = "Verificando IP...";
        await page.goto('https://api.ipify.org', { timeout: 10000 });
        const ipActual = await page.innerText('body');
        console.log(`Consulta desde IP: ${ipActual}`);

        // PASO 2: Entrar a Nequi
        status = "Cargando Nequi...";
        await page.goto('https://recarga.nequi.com.co/recarga-individual', { waitUntil: 'networkidle', timeout: 40000 });

        // PASO 3: Llenar Formulario
        status = "Llenando formulario...";
        await page.type('input#tel-recarga', numero, { delay: 150 });
        await page.type('input#confirm-tel-recarga', numero, { delay: 150 });
        await page.type('input#monto-recarga', '5000', { delay: 100 });
        
        await page.waitForTimeout(2000); 
        await page.click('button#btn-continuar');

        // PASO 4: Buscar Nombre
        status = "Buscando nombre en respuesta...";
        const nombreSelector = '.nombre-cliente-pago';
        
        // Esperamos a ver si aparece el nombre o un error de "Recarga no exitosa"
        const result = await Promise.race([
            page.waitForSelector(nombreSelector, { state: 'visible', timeout: 15000 }).then(() => 'success'),
            page.waitForSelector('.error-message', { state: 'visible', timeout: 15000 }).then(() => 'error_nequi')
        ]);

        if (result === 'success') {
            const nombre = await page.innerText(nombreSelector);
            return { ok: true, data: nombre.trim() };
        } else {
            return { ok: false, error: "Nequi rechazó la consulta (Posible IP bloqueada)" };
        }

    } catch (error) { 
        console.error(`Error en fase [${status}]:`, error.message);
        return { ok: false, error: `Fallo en: ${status}` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- COMANDO /nequi ---
bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) return ctx.reply("🚫 No autorizado.");

    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("❌ Uso: `/nequi 3001234567`", { parse_mode: 'Markdown' });

    const numero = args[1].trim();
    const espera = await ctx.reply(`⏳ [DEBUG] Procesando ${numero}...`);

    const res = await consultarNequi(numero);

    if (res.ok) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Nombre:** \`${res.data}\` \n✅ Consulta Exitosa`, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `❌ **Error:** ${res.error}\n⚠️ Intenta activar Localtonet en tu celular.`);
    }
});

// Mantener el resto de tu lógica de llaves y servidor igual...
bot.launch().then(() => console.log("🚀 Bot con Debug activo en Railway"));
