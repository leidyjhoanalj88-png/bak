require('dotenv').config(); 
const { Telegraf } = require('telegraf');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')(); 
const http = require('http');

chromium.use(stealth);

const bot = new Telegraf(process.env.BOT_TOKEN);
const MI_ID_AUTORIZADO = parseInt(process.env.MI_ID_AUTORIZADO);

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
            userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 3,
            isMobile: true,
            hasTouch: true
        });

        const page = await context.newPage();

        // Bloqueo de recursos para velocidad y ahorro de RAM
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        // PASO 1: Navegar a la HOME de Nequi para "calentar" las cookies
        await page.goto('https://www.nequi.com.co/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500); 

        // PASO 2: IR A LA NUEVA URL (Recarga Individual)
        // Esta URL suele saltarse capas de protección iniciales
        await page.goto('https://recarga.nequi.com.co/recarga-individual', { 
            waitUntil: 'networkidle', 
            timeout: 40000 
        });
        
        // PASO 3: Llenado de campos (Simulando retraso entre campos)
        await page.fill('input#tel-recarga', numero);
        await page.waitForTimeout(500);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.waitForTimeout(500);
        await page.fill('input#monto-recarga', '5000');
        
        // --- TOQUE HUMANO ---
        // Esperamos entre 2 y 4 segundos antes de dar click (Parece que alguien está leyendo)
        const esperaHumana = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
        await page.waitForTimeout(esperaHumana);
        
        // PASO 4: Click en continuar usando dispatch para evitar bloqueos de interfaz
        await page.dispatchEvent('button#btn-continuar', 'click');

        // PASO 5: Esperar el nombre con paciencia
        const nombreSelector = '.nombre-cliente-pago';
        try {
            // Aumentamos el tiempo de espera por si el servidor de Nequi está lento
            await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 25000 });
            const nombre = await page.innerText(nombreSelector);
            
            if (nombre && nombre.trim().length > 2) {
                return nombre.trim();
            }
        } catch (e) {
            console.log(`⚠️ Timeout o bloqueo para el número: ${numero}`);
            return null;
        }

        return null;

    } catch (error) {
        console.error("❌ Error en el proceso Playwright:", error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

bot.command('nequi', async (ctx) => {
    // Seguridad: Solo tú puedes usar el bot
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    
    const args = ctx.message.text.split(' ');
    const numero = args[1];
    
    if (!numero || !/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Formato inválido.\nUso: `/nequi 3001234567`', { parse_mode: 'Markdown' });
    }

    const espera = await ctx.reply(`🔍 Consultando **${numero}**...`, { parse_mode: 'Markdown' });

    try {
        const resultado = await consultarNequi(numero);
        
        if (resultado) {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                espera.message_id, 
                null, 
                `👤 **Nombre Encontrado:**\n\n\`${resultado}\``, 
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.telegram.editMessageText(
                ctx.chat.id, 
                espera.message_id, 
                null, 
                '❌ **Sin resultados**\n\nNequi bloqueó la consulta o el número no tiene cuenta activa.\n\n_Tip: Intenta de nuevo en un momento._',
                { parse_mode: 'Markdown' }
            );
        }
    } catch (err) {
        console.error(err);
        ctx.reply('❌ Error interno al procesar la solicitud.');
    }
});

// Configuración obligatoria para Railway (Servidor Web)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Nequi Bot Status: OK');
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌍 Web Server activo en puerto ${PORT}`);
});

bot.launch()
    .then(() => console.log("🚀 Bot Nequi conectado y listo."))
    .catch((err) => console.error("Error al iniciar bot:", err));

// Cierre seguro
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
