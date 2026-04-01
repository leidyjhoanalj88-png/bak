// --- FUNCIÓN DE CONSULTA CON LOGIN DE ERRORES (DEBUG) ---
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
        
        status = "Cargando Nequi...";
        // Intentamos cargar la página con un tiempo de espera más largo
        await page.goto('https://recarga.nequi.com.co/recarga-individual', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        status = "Buscando campos del formulario...";
        // Verificamos si el input existe antes de escribir
        const inputExiste = await page.isVisible('input#tel-recarga');
        
        if (!inputExiste) {
            // Si no existe, capturamos el título de la página para ver qué hay ahí
            const titulo = await page.title();
            return { ok: false, error: `El formulario no cargó. Título de página: ${titulo}` };
        }

        status = "Escribiendo número...";
        await page.fill('input#tel-recarga', numero);
        await page.fill('input#confirm-tel-recarga', numero);
        await page.fill('input#monto-recarga', '5000');
        
        status = "Dando click en continuar...";
        await page.click('button#btn-continuar');

        // Esperar el resultado
        status = "Esperando respuesta de Nequi...";
        const nombreSelector = '.nombre-cliente-pago';
        
        try {
            await page.waitForSelector(nombreSelector, { state: 'visible', timeout: 10000 });
            const nombre = await page.innerText(nombreSelector);
            return { ok: true, data: nombre.trim() };
        } catch (e) {
            // Si no aparece el nombre, verificamos si hay un mensaje de error visible en la web
            const errorVisible = await page.isVisible('.error-message');
            return { ok: false, error: errorVisible ? "Nequi mostró error de recarga (IP bloqueada)" : "No se encontró el nombre del titular" };
        }

    } catch (error) { 
        // Este log te dirá el error técnico real en la consola de Railway
        console.error(`🔴 ERROR CRÍTICO en [${status}]:`, error.message);
        return { ok: false, error: `Error en fase: ${status}. Detalle: ${error.message.substring(0, 50)}...` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}
