// --- FUNCIÓN DE CONSULTA POR PSE (LA RUTA QUE NO BLOQUEA) ---
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
            isMobile: true,
            hasTouch: true
        });

        const page = await context.newPage();
        
        // PASO 1: Ir a PSE
        status = "Entrando a PSE...";
        await page.goto('https://www.psepagos.co/psehostingui/CategoryDetails.aspx?ID=2', { 
            waitUntil: 'networkidle', 
            timeout: 60000 
        });

        // PASO 2: Llenar el campo de celular en PSE
        status = "Llenando celular en PSE...";
        // Nota: En PSE el ID suele ser diferente, lo buscamos por el tipo de input
        const inputCelular = 'input[type="tel"], input[name*="celular"], .form-control';
        await page.waitForSelector(inputCelular, { timeout: 20000 });
        await page.fill(inputCelular, numero);
        
        // PASO 3: Click en el botón para avanzar y ver el nombre
        status = "Buscando titular...";
        await page.keyboard.press('Enter'); // A veces el botón cambia de ID, Enter es más seguro

        // PASO 4: Capturar el nombre del titular
        // En PSE, el nombre suele aparecer en un resumen antes de pagar
        status = "Esperando nombre en resumen...";
        await page.waitForTimeout(3000); // Esperamos a que cargue la respuesta

        // Intentamos extraer cualquier texto que parezca el nombre del cliente
        const nombre = await page.evaluate(() => {
            // Buscamos etiquetas comunes donde PSE pone el nombre del dueño de la cuenta
            const elementos = document.querySelectorAll('span, td, div, label');
            for (let el of elementos) {
                if (el.innerText.includes('Titular') || el.innerText.includes('Nombre')) {
                    return el.innerText;
                }
            }
            return null;
        });

        if (nombre) {
            return { ok: true, data: nombre.trim() };
        } else {
            return { ok: false, error: "PSE cargó pero no mostró el nombre. (Número inválido o cambio de interfaz)" };
        }

    } catch (error) { 
        console.error(`Error en fase [${status}]:`, error.message);
        return { ok: false, error: `Fallo en PSE: ${status}` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}
