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

        status = "Buscando campo de celular...";
        // Intentamos detectar el campo por múltiples formas (ID, Clase, Tipo o Nombre)
        const selectorUniversal = 'input[type="tel"], input[type="text"], .form-control, #txtCelular, #Celular';
        
        await page.waitForSelector(selectorUniversal, { timeout: 15000 });
        
        status = "Escribiendo número (Simulación humana)...";
        // En lugar de "fill", usamos "type" con delay para que parezca que alguien escribe
        await page.type(selectorUniversal, numero, { delay: 150 });
        
        status = "Enviando consulta...";
        await page.keyboard.press('Enter'); 
        await page.waitForTimeout(5000); // Esperamos a que la base de datos responda

        status = "Leyendo nombre del titular...";
        const resultadoFinal = await page.evaluate(() => {
            // Buscamos cualquier texto que contenga el nombre del cliente en mayúsculas
            const body = document.body.innerText;
            const match = body.match(/[A-Z\s]{10,50}/g); // Busca bloques de letras mayúsculas largas
            return match ? match.join('\n').trim() : null;
        });

        if (resultadoFinal) {
            return { ok: true, data: resultadoFinal };
        } else {
            return { ok: false, error: "Número cargado, pero el nombre no apareció en pantalla." };
        }

    } catch (error) { 
        console.error(`Error en fase [${status}]:`, error.message);
        return { ok: false, error: `Fallo en: ${status} | Causa: Campo no encontrado.` }; 
    } finally { 
        if (browser) await browser.close(); 
    }
}
