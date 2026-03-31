// --- LÓGICA DE TELEGRAM CON COMANDO /nequi ---

// Comando inicial
bot.start((ctx) => {
    if (ctx.from.id !== MI_ID_AUTORIZADO) return;
    ctx.reply('✅ Bot Nequi Activo.\n\nUso: /nequi 3217326803');
});

// Escuchar específicamente el comando /nequi
bot.command('nequi', async (ctx) => {
    // Filtro de seguridad por ID
    if (ctx.from.id !== MI_ID_AUTORIZADO) {
        return ctx.reply('🚫 No tienes autorización.');
    }

    // Extraer el número después del comando /nequi
    const args = ctx.message.text.split(' ');
    const numero = args[1] ? args[1].trim() : null;

    // Validar que se haya enviado algo y que sean 10 dígitos
    if (!numero || !/^\d{10}$/.test(numero)) {
        return ctx.reply('⚠️ Uso incorrecto. Ejemplo:\n/nequi 3217326803');
    }

    const msgEspera = await ctx.reply(`⏳ Consultando ${numero} en Nequi...`);

    const resultado = await consultarNequi(numero);

    if (resultado) {
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            msgEspera.message_id, 
            null, 
            `👤 *Nombre Encontrado:*\n\n\`${resultado.trim()}\``, 
            { parse_mode: 'Markdown' }
        );
    } else {
        await ctx.telegram.editMessageText(
            ctx.chat.id, 
            msgEspera.message_id, 
            null, 
            '❌ No se pudo obtener el nombre.\n\nNúmero inexistente o error de conexión.'
        );
    }
});
