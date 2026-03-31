const { chromium } = require('playwright-extra');
const stealth = require('playwright-extra-plugin-stealth')();

chromium.use(stealth);

(async () => {
  // Configuración de Proxy (Si no tienes uno aún, puedes comentar la línea 'proxy' abajo)
  const proxyConfig = {
    server: 'http://tu-proxy-residencial.com:puerto',
    username: 'tu_usuario',
    password: 'tu_password'
  };

  const browser = await chromium.launch({
    headless: true, // Obligatorio para Docker/Nube
    proxy: proxyConfig 
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'es-CO',
    timezoneId: 'America/Bogota'
  });

  const page = await context.newPage();

  try {
    console.log("🚀 Iniciando navegación...");
    await page.goto('https://recarga.nequi.com.co/', { waitUntil: 'networkidle', timeout: 60000 });

    await page.fill('input#tel-recarga', '3001234567'); 
    await page.fill('input#confirm-tel-recarga', '3001234567');
    await page.fill('input#monto-recarga', '5000');

    await page.click('button#btn-continuar');

    // Esperamos a que aparezca el nombre o falle
    await page.waitForSelector('.nombre-cliente-pago', { timeout: 15000 });
    const nombreEncontrado = await page.innerText('.nombre-cliente-pago');

    console.log("✅ RESULTADO: " + nombreEncontrado);

  } catch (error) {
    console.log("❌ No se pudo obtener el nombre. Detalles:", error.message);
    await page.screenshot({ path: 'error_log.png' }); // Para ver qué pasó si falla
  }

  await browser.close();
})();
