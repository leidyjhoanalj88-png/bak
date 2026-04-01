require('dotenv').config(); 
const { Telegraf, Markup } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 8114050673; 

let llavesGeneradas = new Set(); 
let usuariosAutorizados = new Set([ADMIN_ID]); 

async function consultarNequi(numero) {
    let browser;
    let status = "Iniciando...";
    try {
        browser = await chromium.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });

        const context = await browser.newContext({ 
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
            viewport: { width: 390, height: 844 },
            isMobile: true
        });

        const page = await context.newPage();
        
        status = "Entrando a PSE...";
        await page.goto('https://www.psepagos.co/psehostingui/CategoryDetails.aspx?ID=2', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });

        status = "Analizando contenido...";
        const html = await page.content();
        
        // Si detectamos bloqueo de IP, detenemos todo
        if (html.includes("Access Denied") || html.includes("Cloudflare") || html.includes("403")) {
            console.log("❌ BLOQUEO DETECTADO: La IP de Railway está baneada.");
            return { ok: false, error: "IP de Railway Bloqueada (Data Center detectado)" };
        }

        status = "Buscando campo de celular...";
        // Buscamos cualquier input que acepte texto o números
        const inputSelector = 'input:not([type="hidden"])';
        const input = await page.locator(inputSelector).first();
        
        if (await input.count() === 0) {
            return { ok: false, error: "No se encontró el formulario (Posible Captcha invisible)" };
        }

        status = "Escribiendo número...";
        await input.fill(numero);
        await page.keyboard.press('Enter');
        
        await page.waitForTimeout(6000);

        status = "Extrayendo nombre...";
        const resultado = await page.evaluate(() => {
            const body = document.body.innerText;
            const regex = /(?:TITULAR|CLIENTE|NOMBRE|PAGO A:)\s*([A-ZÁÉÍÓÚÑ\s]{10,60})/i;
            const match = body.match(regex);
            return match ? match[0].trim() : null;
        });

        return resultado ? { ok: true, data: resultado } : { ok: false, error: "Nombre no visible en resumen." };

    } catch (error) { 
        return { ok: false, error: `Fallo en: ${status}` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- COMANDOS (CON PROTECCIÓN DE TOKEN) ---

bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) return;
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("❌ Uso: `/nequi 3001234567`", { parse_mode: 'Markdown' });
    
    const espera = await ctx.reply(`⏳ Buscando titular...`);
    const res = await consultarNequi(args[1].trim());

    if (res.ok) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Resultado:** \n\`${res.data}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `❌ **Error:** ${res.error}`);
    }
});

// Registrar comandos ignorando el error 404 de token si ocurre
bot.telegram.setMyCommands([
    { command: 'start', description: 'Menú' },
    { command: 'nequi', description: 'Consultar' },
    { command: 'registrar', description: 'Activar Key' }
]).catch(() => console.log("⚠️ Error de Comandos: Revisa tu BOT_TOKEN en Railway"));

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Online')).listen(PORT);

bot.launch().catch(err => console.error("❌ Error al iniciar bot:", err.message));
