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

// --- FUNCIÓN DE CONSULTA MAESTRA (PSE + DISFRAZ IPHONE) ---
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
        
        // Bloqueo de basura para velocidad
        await page.route('**/*.{png,jpg,jpeg,css,woff,svg,gif}', route => route.abort());

        status = "Entrando a PSE (ID=2)...";
        await page.goto('https://www.psepagos.co/psehostingui/CategoryDetails.aspx?ID=2', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        status = "Buscando campo de celular...";
        // Selector universal: Busca por tipo tel, nombre celular o clases de formulario comunes
        const selectorUniversal = 'input[type="tel"], input[name*="celular"], input#txtCelular, .form-control';
        await page.waitForSelector(selectorUniversal, { timeout: 20000 });

        status = "Escribiendo número (Simulación iPhone)...";
        await page.click(selectorUniversal);
        await page.type(selectorUniversal, numero, { delay: 120 });
        
        status = "Enviando consulta...";
        await page.keyboard.press('Enter'); 
        await page.waitForTimeout(5000); // Tiempo para que PSE procese el nombre

        status = "Extrayendo titular...";
        const resultado = await page.evaluate(() => {
            // Buscamos cualquier texto en la página que parezca un nombre completo (Mayúsculas)
            const textoPagina = document.body.innerText;
            const lineas = textoPagina.split('\n');
            // Buscamos líneas que contengan palabras clave de PSE
            for (let linea of lineas) {
                if (linea.includes('Titular') || linea.includes('Nombre') || linea.includes('CLIENTE')) {
                    return linea.trim();
                }
            }
            // Si no encuentra etiquetas, busca bloques largos de texto en Mayúsculas
            const matchMayus = textoPagina.match(/[A-ZÁÉÍÓÚÑ\s]{12,60}/g);
            return matchMayus ? matchMayus[0].trim() : null;
        });

        if (resultado) {
            return { ok: true, data: resultado };
        } else {
            return { ok: false, error: "PSE cargó pero el nombre no se visualizó." };
        }

    } catch (error) { 
        console.error(`🔴 Error en fase [${status}]:`, error.message);
        return { ok: false, error: `Fallo en: ${status}` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// --- COMANDOS Y LÓGICA DEL BOT ---

bot.start((ctx) => {
    const teclado = ctx.from.id === ADMIN_ID ? 
        Markup.keyboard([['🔍 Realizar Consulta', '🎫 Generar Key'], ['📊 Stats']]).resize() :
        Markup.keyboard([['🔑 Registrar Llave', '👤 Soporte / Comprar']]).resize();
    
    ctx.reply(`꧁༺ 𝓬𝓪𝓼𝓱 𝓬𝓸𝓵 ༻꧂\n\nBienvenido @${ctx.from.username || 'Admin'}.`, teclado);
});

// COMANDO PRINCIPAL /nequi
bot.command('nequi', async (ctx) => {
    if (!usuariosAutorizados.has(ctx.from.id)) return ctx.reply("🚫 No tienes acceso.");
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("❌ Uso: `/nequi 3001234567`", { parse_mode: 'Markdown' });

    const numero = args[1].trim();
    if (!/^\d{10}$/.test(numero)) return ctx.reply("⚠️ El número debe ser de 10 dígitos.");

    const espera = await ctx.reply(`⏳ [PSE] Buscando titular de \`${numero}\`...`, { parse_mode: 'Markdown' });
    const res = await consultarNequi(numero);

    if (res.ok) {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `👤 **Titular:** \n\`${res.data}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.telegram.editMessageText(ctx.chat.id, espera.message_id, null, `❌ **Error:** ${res.error}\n⚠️ Si persiste, activa Localtonet.`);
    }
});

// REGISTRO DE LLAVES
bot.command('registrar', (ctx) => {
    const key = ctx.message.text.split(' ')[1];
    if (llavesGeneradas.has(key)) {
        llavesGeneradas.delete(key);
        usuariosAutorizados.add(ctx.from.id);
        ctx.reply("✅ Acceso Activado Correctamente.", Markup.keyboard([['🔍 Realizar Consulta']]).resize());
    } else {
        ctx.reply("❌ Key inválida o ya usada.");
    }
});

// FUNCIONES DE ADMIN
bot.hears('🎫 Generar Key', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const key = 'CASH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    llavesGeneradas.add(key);
    ctx.reply(`🎫 **Key Nueva:** \`${key}\``, { parse_mode: 'Markdown' });
});

bot.hears('📊 Stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`📊 **Estadísticas:**\nUsuarios: ${usuariosAutorizados.size}\nKeys: ${llavesGeneradas.size}`);
});

bot.hears('🔍 Realizar Consulta', (ctx) => {
    ctx.reply("Escribe el comando: `/nequi NUMERO`", { parse_mode: 'Markdown' });
});

// Configuración del Menú Azul
bot.telegram.setMyCommands([
    { command: 'start', description: 'Menú principal' },
    { command: 'nequi', description: 'Consultar (Ej: /nequi 3001234567)' },
    { command: 'registrar', description: 'Activar acceso' }
]);

// Servidor Keep-Alive
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Online')).listen(PORT);

bot.launch({ dropPendingUpdates: true }).then(() => console.log("🚀 Cash Col Bot Actualizado en Railway"));
