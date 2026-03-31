require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 

chromium.use(stealth);

const BOT_TOKEN = process.env.BOT_TOKEN;
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);

async function consultarNequi(numero) {
    let browser;
    try {
        browser = await chromium.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
        });

        const page = await context.newPage();

        // ⚡ OPTIMIZACIÓN: Bloquear imágenes, fuentes y CSS para mayor velocidad
        await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,woff2,otf}', route => route.abort());

        // Ir a la página con tiempo de espera optimizado
        await page.goto('https://recarga.nequi.com.co/', { 
            waitUntil: 'networkidle', 
            timeout: 40000 
        });
        
        // Llenado rápido pero seguro
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        // Pequeña espera para asegurar que el botón se habilite
        await page.waitForTimeout(500);
        
        // Forzar el click
        await page.dispatchEvent('button#btn-continuar', 'click');

        // Esperar el nombre con un timeout más corto para no dejar al usuario colgado
        const nombreSelector = '.nombre-cliente-pago';
        
        try {
            // Esperamos que el selector aparezca
            await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 15000 });
            const nombre = await page.innerText(nombreSelector);
            
            if (nombre && nombre.trim().length > 1) {
                return nombre.trim();
            }
        } catch (e) {
            console.log(`⚠️ No se detectó el nombre para ${numero} (Posible bloqueo o número sin cuenta)`);
        }

        return null;

    } catch (error) {
        console.error("❌ Error en consulta:", error.message);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

// Comandos del Bot
bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('✅ Bot Nequi Optimizado Activo.\n\nUso: /nequi 3001234567');
});

bot.command('nequi', async (ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return ctx.reply('🚫 No autorizado.');

    const args = ctx.message.text.split(' ');
    const numero = args[1] ? args[1].trim() : null;

    if (!numero || !/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Envía un número válido de 10 dígitos.\nEj: `/nequi 3210000000`', { parse_mode: 'Markdown' });
    }

    const msgEspera = await ctx.reply(`⏳ Consultando a **${numero}**...`, { parse_mode: 'Markdown' });

    try {
        const resultado = await consultarNequi(numero);

        if (resultado) {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                msgEspera.message_id, 
                null, 
                `👤 **Nombre Encontrado:**\n\n\`${resultado}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                msgEspera.message_id, 
                null, 
                '❌ **Sin resultados**\n\nNequi no devolvió un nombre. Razones posibles:\n1. El número no es Nequi.\n2. La IP del bot está bloqueada temporalmente.\n3. El servicio de recargas está caído.',
                { parse_mode: 'Markdown' }
            );
        }
    } catch (e) {
        ctx.reply('❌ Error crítico en el servidor.');
    }
});

// Mantener el servidor vivo
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot Online');
}).listen(PORT, '0.0.0.0');

bot.launch()
    .then(() => console.log("🚀 Bot Nequi conectado exitosamente."))
    .catch(err => console.error("Error al iniciar bot:", err));
