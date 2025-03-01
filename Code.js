// ID de la hoja de cálculo para almacenar reservas
const SPREADSHEET_ID = '1UHsc-1rnMdiJfM8uycz4JjMVrQ74n-UzjOS8fQ6UaBk';

/**
 * Función auxiliar para formatear una hora desde un objeto Date
 * Adaptada para Colombia (GMT-5)
 */
function formatearHora(horaObj) {
  try {
    // Si ya es un string en formato HH:MM, devolverlo tal cual
    if (typeof horaObj === 'string' && horaObj.match(/^\d{1,2}:\d{2}$/)) {
      return horaObj;
    }
    
    // Si es un objeto Date
    if (horaObj instanceof Date) {
      // En Colombia GMT-5, por lo que necesitamos ajustar
      const horasUTC = horaObj.getUTCHours();
      // Ajustar a zona horaria de Colombia (GMT-5)
      const horasColombia = (horasUTC - 5 + 24) % 24;
      const minutos = horaObj.getUTCMinutes().toString().padStart(2, '0');
      return `${horasColombia}:${minutos}`;
    }
    
    // Si es un string con formato ISO
    if (typeof horaObj === 'string' && horaObj.includes('T')) {
      const match = horaObj.match(/T(\d{2}):(\d{2})/);
      if (match) {
        // Extraer horas y minutos
        let horas = parseInt(match[1], 10);
        const minutos = match[2];
        
        // Ajustar a zona horaria de Colombia (GMT-5)
        horas = (horas - 5 + 24) % 24;
        
        return `${horas}:${minutos}`;
      }
    }
    
    // Si no se pudo procesar, devolver el original
    return horaObj;
  } catch (e) {
    Logger.log('Error al formatear hora: ' + e.toString());
    return horaObj;
  }
}
/**
 * Función para probar la conexión a la hoja de cálculo
 * Ejecutar esta función desde el editor de Apps Script para verificar la conexión
 */
function testSpreadsheetConnection() {
  try {
    Logger.log('Intentando abrir la hoja de cálculo con ID: ' + SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    Logger.log('✅ Conexión exitosa! Nombre de la hoja: ' + ss.getName());
    
    // Listar todas las hojas
    const sheets = ss.getSheets();
    Logger.log('Hojas disponibles:');
    sheets.forEach(sheet => {
      Logger.log(' - ' + sheet.getName());
    });
    
    // Verificar si existe la hoja "Reservas"
    const reservasSheet = ss.getSheetByName('Reservas');
    if (reservasSheet) {
      Logger.log('✅ La hoja "Reservas" existe');
      
      // Contar filas con datos
      const lastRow = reservasSheet.getLastRow();
      Logger.log('Número de filas en la hoja: ' + lastRow);
      
      if (lastRow > 1) {
        // Mostrar las primeras filas para depuración
        const datos = reservasSheet.getRange(1, 1, Math.min(lastRow, 5), 7).getValues();
        Logger.log('Primeras filas de datos:');
        Logger.log(JSON.stringify(datos));
      } else {
        Logger.log('La hoja solo tiene encabezados o está vacía');
      }
    } else {
      Logger.log('⚠️ La hoja "Reservas" no existe, se creará automáticamente');
      crearHojaReservas(ss);
    }
    
    return true;
  } catch (e) {
    Logger.log('❌ ERROR: ' + e.toString());
    if (e.toString().includes('no tiene acceso')) {
      Logger.log('⚠️ Problema de permisos: Asegúrate de que el script tenga acceso a la hoja de cálculo');
    } else if (e.toString().includes('not found')) {
      Logger.log('⚠️ Hoja de cálculo no encontrada: Verifica que el ID sea correcto');
    }
    return false;
  }
}

/**
 * Función que crea el menú en la hoja de cálculo
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Sistema de Reservas')
      .addItem('Abrir aplicación', 'openWebApp')
      .addItem('Verificar conexión', 'testSpreadsheetConnection')
      .addToUi();
    
    Logger.log('Menú creado correctamente');
  } catch (e) {
    Logger.log('Error en onOpen: ' + e.toString());
  }
}

/**
 * Abre la aplicación web
 */
function openWebApp() {
  try {
    const webAppUrl = ScriptApp.getService().getUrl();
    Logger.log('URL de la aplicación web: ' + webAppUrl);
    
    const html = HtmlService.createHtmlOutput(
      `<script>window.open('${webAppUrl}', '_blank');</script>`
    )
      .setWidth(10)
      .setHeight(10);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Abriendo aplicación...');
    
    Logger.log('Aplicación abierta correctamente');
  } catch (e) {
    Logger.log('Error en openWebApp: ' + e.toString());
    SpreadsheetApp.getUi().alert('Error al abrir la aplicación: ' + e.toString());
  }
}

/**
 * Función doGet que se ejecuta cuando se accede a la aplicación web
 */
function doGet() {
  try {
    Logger.log('Iniciando doGet - Cargando aplicación web');
    
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Reserva de Salas de Reunión')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    Logger.log('Error en doGet: ' + e.toString());
    return HtmlService.createHtmlOutput(
      `<h1>Error</h1><p>${e.toString()}</p>`
    );
  }
}

/**
 * Incluye un archivo HTML
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    Logger.log('Error en include(' + filename + '): ' + e.toString());
    return `<div class="alert alert-danger">Error al cargar ${filename}: ${e.toString()}</div>`;
  }
}

/**
 * Crea una nueva hoja de reservas
 */
function crearHojaReservas(ss) {
  try {
    Logger.log('Creando nueva hoja "Reservas"');
    
    const sheet = ss.insertSheet('Reservas');
    sheet.appendRow([
      'ID_REUNION',
      'FECHA',
      'HORA_INICIAL',
      'HORA_FINAL',
      'AREA',
      'SALA_SELECCIONADA',
      'PROMEDIO_DE_PERSONAS_EN_REUNION'
    ]);
    
    // Dar formato a la hoja
    sheet.getRange(1, 1, 1, 7).setBackground('#f1c232').setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    Logger.log('Hoja "Reservas" creada exitosamente');
    return sheet;
  } catch (e) {
    Logger.log('Error al crear hoja Reservas: ' + e.toString());
    throw e; // Re-lanzar para manejo superior
  }
}
/**
 * Obtiene todas las reservas existentes con mejor manejo de errores
 * y formateo de horas
 */
function getReservas() {
  try {
    Logger.log('Iniciando getReservas con spreadsheetId: ' + SPREADSHEET_ID);
    
    // Acceder a la hoja de cálculo
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('Hoja de cálculo abierta correctamente: ' + ss.getName());
    
    // Verificar si existe la hoja "Reservas"
    let sheet = ss.getSheetByName('Reservas');
    if (!sheet) {
      Logger.log('No existe la hoja "Reservas", creando una nueva...');
      sheet = crearHojaReservas(ss);
      return { success: true, reservas: [] };
    }
    
    // Obtener y verificar datos
    const data = sheet.getDataRange().getValues();
    Logger.log('Se obtuvieron ' + data.length + ' filas de datos');
    
    if (data.length <= 1) {
      Logger.log('La hoja solo tiene encabezados, no hay reservas');
      return { success: true, reservas: [] };
    }
    
    // Procesar datos
    const headers = data[0];
    Logger.log('Encabezados: ' + headers.join(', '));
    
    const reservas = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Si tiene ID
        const reserva = {};
        for (let j = 0; j < headers.length; j++) {
          // Guardar cada campo con su nombre de encabezado
          reserva[headers[j]] = data[i][j];
        }
        
        // Asegurarse de que FECHA sea un objeto Date válido
        if (reserva.FECHA && !(reserva.FECHA instanceof Date)) {
          try {
            // Si es un string, convertirlo a Date
            if (typeof reserva.FECHA === 'string') {
              reserva.FECHA = new Date(reserva.FECHA);
            }
          } catch (e) {
            Logger.log('Error al convertir fecha en fila ' + i + ': ' + e.toString());
          }
        }
        
        // Formatear HORA_INICIAL y HORA_FINAL a formato HH:MM
        if (reserva.HORA_INICIAL) {
          // Si ya es un string en formato HH:MM, conservarlo tal cual
          if (typeof reserva.HORA_INICIAL === 'string' && reserva.HORA_INICIAL.match(/^\d{1,2}:\d{2}$/)) {
            // Mantener como está
            Logger.log('Hora inicial ya está en formato correcto: ' + reserva.HORA_INICIAL);
          } else {
            // Aplicar formateo con ajuste para Colombia
            reserva.HORA_INICIAL = formatearHora(reserva.HORA_INICIAL);
            Logger.log('Hora inicial formateada para Colombia: ' + reserva.HORA_INICIAL);
          }
        }

        if (reserva.HORA_FINAL) {
          // Si ya es un string en formato HH:MM, conservarlo tal cual
          if (typeof reserva.HORA_FINAL === 'string' && reserva.HORA_FINAL.match(/^\d{1,2}:\d{2}$/)) {
            // Mantener como está
            Logger.log('Hora final ya está en formato correcto: ' + reserva.HORA_FINAL);
          } else {
            // Aplicar formateo con ajuste para Colombia
            reserva.HORA_FINAL = formatearHora(reserva.HORA_FINAL);
            Logger.log('Hora final formateada para Colombia: ' + reserva.HORA_FINAL);
          }
        }
        
        // Añadir la reserva procesada al array
        reservas.push(reserva);
      }
    } // Fin del bucle for
    
    Logger.log('Procesadas ' + reservas.length + ' reservas exitosamente');
    
    // Registrar la primera reserva para depuración
    if (reservas.length > 0) {
      Logger.log('Primera reserva:');
      Logger.log(JSON.stringify(reservas[0]));
    }

    // Al final de la función getReservas(), antes del return
    Logger.log('Datos de reservas que se envían al cliente:');
    Logger.log(JSON.stringify({success: true, reservas: reservas}));
    
    // Dentro de getReservas(), reemplaza el mapeo de reservasSimplificadas con esto:

// Convertir las reservas a un formato más simple que el cliente pueda procesar
const reservasSimplificadas = reservas.map(r => {
  let fechaISO;
  
  // Procesamiento especial para la fecha
  if (r.FECHA instanceof Date) {
    // Obtener componentes de la fecha en UTC
    const anio = r.FECHA.getFullYear();
    const mes = r.FECHA.getMonth(); // 0-11
    const dia = r.FECHA.getDate();
    
    // Crear un string de fecha ISO pero conservando el día correcto
    // Para Colombia, usamos el objeto Date directamente ya que la zona horaria
    // ya ha sido ajustada por Google Sheets
    fechaISO = r.FECHA.toISOString();
    
    Logger.log(`Fecha original: ${r.FECHA}, fecha ISO: ${fechaISO}`);
  } else {
    fechaISO = String(r.FECHA);
  }
  
  // Asegurarnos de que las horas están en el formato correcto
  let horaInicial = typeof r.HORA_INICIAL === 'string' ? r.HORA_INICIAL : '00:00';
  let horaFinal = typeof r.HORA_FINAL === 'string' ? r.HORA_FINAL : '00:00';
  
  // Registrar para depuración
  Logger.log(`Reserva a enviar - ID: ${r.ID_REUNION}, Fecha: ${fechaISO}, Hora: ${horaInicial}-${horaFinal}`);
  
  return {
    ID_REUNION: r.ID_REUNION,
    FECHA: fechaISO,
    HORA_INICIAL: horaInicial,
    HORA_FINAL: horaFinal,
    AREA: String(r.AREA || ''),
    SALA_SELECCIONADA: String(r.SALA_SELECCIONADA || ''),
    PROMEDIO_DE_PERSONAS_EN_REUNION: Number(r.PROMEDIO_DE_PERSONAS_EN_REUNION || 1)
  };
});
    
    Logger.log('Datos de reservas simplificadas que se envían al cliente:');
    Logger.log(JSON.stringify({success: true, reservas: reservasSimplificadas}));
    
    return { success: true, reservas: reservasSimplificadas };
  } catch (e) {
    Logger.log('Error en getReservas: ' + e.toString());
    // Proporcionar información detallada sobre el error
    return { 
      success: false, 
      message: e.toString(),
      location: 'getReservas',
      stackTrace: e.stack
    };
  }
}

/**
 * Guarda una nueva reserva con mejor manejo de fechas para Colombia
 */
function guardarReserva(reservaData) {
  try {
    Logger.log('Guardando reserva: ' + JSON.stringify(reservaData));
    
    // Validación básica
    if (!reservaData || !reservaData.fecha || !reservaData.salaSeleccionada) {
      Logger.log('Error: Datos de reserva incompletos');
      return { 
        success: false, 
        message: 'Datos de reserva incompletos',
        camposFaltantes: !reservaData.fecha ? 'fecha' : (!reservaData.salaSeleccionada ? 'salaSeleccionada' : 'otros')
      };
    }
    
    // Acceder a la hoja de cálculo
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Obtener o crear hoja
    let sheet = ss.getSheetByName('Reservas');
    if (!sheet) {
      Logger.log('No existe la hoja "Reservas", creando una nueva');
      sheet = crearHojaReservas(ss);
    }
    
    // Generar ID único
    const id = Utilities.getUuid();
    
    // Procesar fecha con ajuste para Colombia
    let fechaObj;
    try {
      Logger.log('Procesando fecha original: ' + reservaData.fecha);
      
      // Si viene en formato yyyy-MM-dd (del input date HTML5)
      if (reservaData.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [anio, mes, dia] = reservaData.fecha.split('-').map(Number);
        
        // Crear fecha a mediodía para evitar problemas de zona horaria
        // Restamos 1 al mes porque en JavaScript los meses van de 0 a 11
        fechaObj = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
        Logger.log('Fecha parseada desde formato yyyy-MM-dd: ' + fechaObj);
      } 
      // Si viene en formato DD/MM/YYYY
      else if (reservaData.fecha.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const [dia, mes, anio] = reservaData.fecha.split('/').map(Number);
        
        // Crear fecha a mediodía para evitar problemas de zona horaria
        // Restamos 1 al mes porque en JavaScript los meses van de 0 a 11
        fechaObj = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
        Logger.log('Fecha parseada desde formato DD/MM/YYYY: ' + fechaObj);
      } 
      // Intento general de parseo
      else {
        fechaObj = new Date(reservaData.fecha);
        
        // Verificar si la fecha es válida
        if (isNaN(fechaObj.getTime())) {
          Logger.log('La fecha proporcionada no es válida, usando fecha actual');
          fechaObj = new Date();
        }
        
        // Establecer la hora a mediodía para evitar problemas de zona horaria
        fechaObj.setUTCHours(12, 0, 0, 0);
      }
      
      // Verificar si después del procesamiento quedó válida
      if (isNaN(fechaObj.getTime())) {
        Logger.log('Error al procesar fecha, usando fecha actual');
        fechaObj = new Date();
        fechaObj.setUTCHours(12, 0, 0, 0);
      }
    } catch (e) {
      Logger.log('Error al procesar fecha: ' + e.toString());
      fechaObj = new Date(); // Fallback a hoy
      fechaObj.setUTCHours(12, 0, 0, 0);
    }
    
    Logger.log('Fecha final procesada para guardar: ' + fechaObj.toISOString());
    
    // Verificar conflictos de horario antes de guardar
    const verificacion = verificarConflictos(
      fechaObj, 
      reservaData.horaInicial, 
      reservaData.horaFinal, 
      reservaData.salaSeleccionada
    );
    
    if (verificacion.success && verificacion.hayConflictos) {
      Logger.log('Se detectaron conflictos de horario');
      return {
        success: false,
        message: 'La sala ya está reservada en ese horario',
        conflictos: verificacion.conflictos
      };
    }
    
    // Añadir fila de datos
    sheet.appendRow([
      id,
      fechaObj,
      reservaData.horaInicial,
      reservaData.horaFinal,
      reservaData.area,
      reservaData.salaSeleccionada,
      reservaData.personasReunion || 1
    ]);
    
    Logger.log('Reserva guardada correctamente con ID: ' + id);
    return { success: true, message: 'Reserva guardada correctamente', id: id };
  } catch (e) {
    Logger.log('Error en guardarReserva: ' + e.toString());
    return { 
      success: false, 
      message: e.toString(),
      location: 'guardarReserva'
    };
  }
}
/**
 * Elimina una reserva existente
 */
function eliminarReserva(id) {
  try {
    Logger.log('Intentando eliminar reserva con ID: ' + id);
    
    if (!id) {
      Logger.log('Error: ID de reserva no proporcionado');
      return { success: false, message: 'ID de reserva no proporcionado' };
    }
    
    // Acceder a la hoja
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Reservas');
    
    if (!sheet) {
      Logger.log('Error: No existe la hoja de reservas');
      return { success: false, message: 'No existe la hoja de reservas' };
    }
    
    // Buscar la reserva por ID
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        // Eliminar la fila
        sheet.deleteRow(i + 1); // +1 porque los índices empiezan en 1
        Logger.log('Reserva eliminada con éxito: ' + id);
        return { success: true, message: 'Reserva eliminada con éxito' };
      }
    }
    
    Logger.log('No se encontró la reserva con ID: ' + id);
    return { success: false, message: 'No se encontró la reserva con el ID proporcionado' };
  } catch (e) {
    Logger.log('Error en eliminarReserva: ' + e.toString());
    return { 
      success: false, 
      message: e.toString(),
      location: 'eliminarReserva'
    };
  }
}

/**
 * Función adicional para verificar si hay conflictos de horarios
 * Útil para implementar validación de reservas superpuestas
 */
function verificarConflictos(fecha, horaInicial, horaFinal, sala, idExcluir = null) {
  try {
    Logger.log(`Verificando conflictos: ${fecha}, ${horaInicial}-${horaFinal}, Sala ${sala}`);
    
    // Convertir fecha a objeto Date si es string
    let fechaObj;
    if (typeof fecha === 'string') {
      fechaObj = new Date(fecha);
    } else {
      fechaObj = fecha;
    }
    
    // Formatear fecha para comparación (solo fecha, sin hora)
    const fechaFormateada = Utilities.formatDate(fechaObj, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // Obtener todas las reservas
    const resultado = getReservas();
    if (!resultado.success || !resultado.reservas || resultado.reservas.length === 0) {
      return { success: true, hayConflictos: false };
    }
    
    // Verificar conflictos
    const conflictos = [];
    
    for (const reserva of resultado.reservas) {
      // Ignorar si es la misma reserva que estamos editando
      if (idExcluir && reserva.ID_REUNION === idExcluir) {
        continue;
      }
      
      // Ignorar si no es la misma sala
      if (reserva.SALA_SELECCIONADA !== sala) {
        continue;
      }
      
      // Formatear fecha de la reserva
      let fechaReserva;
      if (reserva.FECHA instanceof Date) {
        fechaReserva = Utilities.formatDate(reserva.FECHA, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      } else {
        try {
          fechaReserva = Utilities.formatDate(new Date(reserva.FECHA), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } catch (e) {
          Logger.log('Error al formatear fecha de reserva: ' + e.toString());
          continue; // Saltar esta reserva
        }
      }
      
      // Continuar solo si es el mismo día
      if (fechaReserva !== fechaFormateada) {
        continue;
      }
      
      // Convertir horas a minutos para facilitar comparación
      const [horaInicialNum, minutoInicialNum] = horaInicial.split(':').map(Number);
      const [horaFinalNum, minutoFinalNum] = horaFinal.split(':').map(Number);
      const inicioNuevo = horaInicialNum * 60 + minutoInicialNum;
      const finNuevo = horaFinalNum * 60 + minutoFinalNum;
      
      const [horaInicialReserva, minutoInicialReserva] = reserva.HORA_INICIAL.split(':').map(Number);
      const [horaFinalReserva, minutoFinalReserva] = reserva.HORA_FINAL.split(':').map(Number);
      const inicioExistente = horaInicialReserva * 60 + minutoInicialReserva;
      const finExistente = horaFinalReserva * 60 + minutoFinalReserva;
      
      // Verificar si hay solapamiento
      if ((inicioNuevo >= inicioExistente && inicioNuevo < finExistente) || 
          (finNuevo > inicioExistente && finNuevo <= finExistente) || 
          (inicioNuevo <= inicioExistente && finNuevo >= finExistente)) {
        conflictos.push({
          id: reserva.ID_REUNION,
          area: reserva.AREA,
          horario: `${reserva.HORA_INICIAL} - ${reserva.HORA_FINAL}`
        });
      }
    }
    
    return { 
      success: true, 
      hayConflictos: conflictos.length > 0,
      conflictos: conflictos
    };
  } catch (e) {
    Logger.log('Error en verificarConflictos: ' + e.toString());
    return { 
      success: false, 
      message: e.toString(),
      hayConflictos: false
    };
  }
}