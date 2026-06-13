/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INTERFAZ UI PARA REPORTES DE IMPUTACIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo especializado en:
 * - Visualización de reportes de imputación
 * - Descargas en múltiples formatos
 * - Integración con interfaz HTML
 * - Alertas y notificaciones de progreso
 * 
 * Versión: 1.0 UI
 */

'use strict';

const NullValueImputationUI = (() => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. VISUALIZACIÓN DE REPORTES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const Visualizador = {
    
    /**
     * Muestra reporte en modal/contenedor
     */
    mostrarReporteEnModal(reporte, tandaID) {
      const modal = document.createElement('div');
      modal.className = 'modal-imputacion';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      const contenedor = document.createElement('div');
      contenedor.className = 'modal-content-imputacion';
      contenedor.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 30px;
        max-width: 900px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      `;

      contenedor.innerHTML = this.generarHTMLReporte(reporte, tandaID);

      // Botones de acción
      const botonesDiv = document.createElement('div');
      botonesDiv.style.cssText = `
        margin-top: 20px;
        display: flex;
        gap: 10px;
        justify-content: center;
      `;

      const btnDescargarJSON = document.createElement('button');
      btnDescargarJSON.textContent = '📥 Descargar JSON';
      btnDescargarJSON.style.cssText = 'padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;';
      btnDescargarJSON.onclick = () => Descargador.descargarReporte(reporte, 'json', tandaID);

      const btnDescargarCSV = document.createElement('button');
      btnDescargarCSV.textContent = '📊 Descargar CSV';
      btnDescargarCSV.style.cssText = 'padding: 10px 20px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;';
      btnDescargarCSV.onclick = () => Descargador.descargarReporte(reporte, 'csv', tandaID);

      const btnCerrar = document.createElement('button');
      btnCerrar.textContent = '❌ Cerrar';
      btnCerrar.style.cssText = 'padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;';
      btnCerrar.onclick = () => modal.remove();

      botonesDiv.appendChild(btnDescargarJSON);
      botonesDiv.appendChild(btnDescargarCSV);
      botonesDiv.appendChild(btnCerrar);

      contenedor.appendChild(botonesDiv);
      modal.appendChild(contenedor);

      // Cerrar al hacer clic fuera
      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };

      document.body.appendChild(modal);
    },

    /**
     * Genera HTML del reporte
     */
    generarHTMLReporte(reporte, tandaID) {
      const html = `
        <h2 style="color: #2c3e50; margin-bottom: 20px;">
          📊 REPORTE DE IMPUTACIÓN DE VALORES NULOS
        </h2>
        
        <div style="background: #ecf0f1; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p><strong>Fecha:</strong> ${reporte.fecha_procesamiento}</p>
          <p><strong>Tanda ID:</strong> ${tandaID}</p>
          <p><strong>Total Registros Procesados:</strong> ${reporte.total_registros_procesados}</p>
        </div>

        ${this.generarSecciónNulos(reporte)}
        ${this.generarSecciónMétodos(reporte)}
        ${this.generarSecciónRecuperación(reporte)}
        ${this.generarSecciónCalidad(reporte)}
      `;
      return html;
    },

    generarSecciónNulos(reporte) {
      if (!reporte.resumen_nulos.columnas_con_nulos.length) {
        return '<div style="background: #d5f4e6; padding: 15px; border-radius: 4px; margin: 15px 0;"><p>✅ <strong>Dataset Completo:</strong> No se detectaron valores nulos</p></div>';
      }

      const tabla = reporte.resumen_nulos.columnas_con_nulos
        .map(col => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #bdc3c7;">${col.columna}</td>
            <td style="padding: 10px; border-bottom: 1px solid #bdc3c7; text-align: center;"><strong>${col.nulos_encontrados}</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #bdc3c7; text-align: center;">
              <span style="background: ${col.porcentaje > 50 ? '#e74c3c' : '#f39c12'}; color: white; padding: 5px 10px; border-radius: 3px;">
                ${col.porcentaje}%
              </span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #bdc3c7; text-align: center;">${col.valores_válidos}</td>
          </tr>
        `).join('');

      return `
        <h3 style="color: #2c3e50; margin-top: 20px;">🔍 NULOS DETECTADOS</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #34495e; color: white;">
            <th style="padding: 12px; text-align: left;">Columna</th>
            <th style="padding: 12px; text-align: center;">Nulos</th>
            <th style="padding: 12px; text-align: center;">Porcentaje</th>
            <th style="padding: 12px; text-align: center;">Válidos</th>
          </tr>
          ${tabla}
        </table>
      `;
    },

    generarSecciónMétodos(reporte) {
      const metodos = Object.entries(reporte.métodos_aplicados)
        .map(([col, meta]) => {
          const valor = meta.valor_promedio ? meta.valor_promedio.toFixed(2) : 
                       meta.moda_valor || '-';
          return `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #bdc3c7;">${col}</td>
              <td style="padding: 10px; border-bottom: 1px solid #bdc3c7;">
                <span style="background: #3498db; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;">
                  ${meta.método}
                </span>
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #bdc3c7; text-align: center;"><strong>${meta.total_imputados}</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #bdc3c7; text-align: center;">${valor}</td>
            </tr>
          `;
        }).join('');

      if (!metodos) {
        return '<h3 style="color: #2c3e50; margin-top: 20px;">⚙️ MÉTODOS APLICADOS</h3><p>Sin imputaciones realizadas</p>';
      }

      return `
        <h3 style="color: #2c3e50; margin-top: 20px;">⚙️ MÉTODOS APLICADOS</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #34495e; color: white;">
            <th style="padding: 12px; text-align: left;">Columna</th>
            <th style="padding: 12px; text-align: left;">Método</th>
            <th style="padding: 12px; text-align: center;">Imputados</th>
            <th style="padding: 12px; text-align: center;">Valor</th>
          </tr>
          ${metodos}
        </table>
      `;
    },

    generarSecciónRecuperación(reporte) {
      const rec = reporte.recuperación;
      return `
        <h3 style="color: #2c3e50; margin-top: 20px;">✅ RECUPERACIÓN DE DATOS</h3>
        <div style="background: #f0f3f4; padding: 15px; border-radius: 4px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 4px;">
              <div style="font-size: 24px; color: #2ecc71; font-weight: bold;">${rec.registros_recuperados_por_reglas_clínicas}</div>
              <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Registros por Reglas Clínicas</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 4px;">
              <div style="font-size: 24px; color: #3498db; font-weight: bold;">${rec.registros_recuperados_por_imputación_estadística}</div>
              <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Registros por Estadística</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 4px;">
              <div style="font-size: 24px; color: #e74c3c; font-weight: bold;">${rec.total_imputaciones_realizadas}</div>
              <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Total Imputaciones</div>
            </div>
          </div>
        </div>
      `;
    },

    generarSecciónCalidad(reporte) {
      const cal = reporte.métricas_calidad;
      const mejora = parseFloat(cal.mejora_completitud);
      const colorMejora = mejora > 0 ? '#2ecc71' : '#e74c3c';

      return `
        <h3 style="color: #2c3e50; margin-top: 20px;">📈 MÉTRICAS DE CALIDAD</h3>
        <div style="background: #f0f3f4; padding: 15px; border-radius: 4px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div style="text-align: center; padding: 15px; background: white; border-radius: 4px;">
              <div style="font-size: 24px; color: #9b59b6; font-weight: bold;">${cal.porcentaje_completitud_final}%</div>
              <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Completitud Final</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 4px;">
              <div style="font-size: 24px; color: ${colorMejora}; font-weight: bold;">+${cal.mejora_completitud}%</div>
              <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Mejora en Completitud</div>
            </div>
            <div style="text-align: center; padding: 15px; background: white; border-radius: 4px;">
              <div style="font-size: 24px; color: #16a085; font-weight: bold;">${cal.registros_sin_cambios}</div>
              <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Registros Sin Cambios</div>
            </div>
          </div>
        </div>
      `;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DESCARGADOR DE REPORTES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const Descargador = {
    
    /**
     * Descarga reporte en formato especificado
     */
    descargarReporte(reporte, formato, tandaID) {
      let contenido, nombreArchivo, tipoMIME;

      if (formato === 'json') {
        contenido = JSON.stringify(reporte, null, 2);
        nombreArchivo = `reporte-imputacion-${tandaID}-${this.obtenerFecha()}.json`;
        tipoMIME = 'application/json';
      } else if (formato === 'csv') {
        contenido = this.generarCSV(reporte);
        nombreArchivo = `reporte-imputacion-${tandaID}-${this.obtenerFecha()}.csv`;
        tipoMIME = 'text/csv';
      } else if (formato === 'html') {
        contenido = this.generarHTML(reporte, tandaID);
        nombreArchivo = `reporte-imputacion-${tandaID}-${this.obtenerFecha()}.html`;
        tipoMIME = 'text/html';
      }

      // Crear descarga
      const blob = new Blob([contenido], { type: tipoMIME });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Descargado: ${nombreArchivo}`);
    },

    generarCSV(reporte) {
      let csv = 'REPORTE DE IMPUTACIÓN DE VALORES NULOS\n';
      csv += `Fecha,${reporte.fecha_procesamiento}\n`;
      csv += `Total Registros,${reporte.total_registros_procesados}\n\n`;

      csv += 'NULOS DETECTADOS\n';
      csv += 'Columna,Nulos Encontrados,Porcentaje,Valores Válidos\n';
      reporte.resumen_nulos.columnas_con_nulos.forEach(col => {
        csv += `"${col.columna}",${col.nulos_encontrados},${col.porcentaje}%,${col.valores_válidos}\n`;
      });

      csv += '\nMÉTODOS APLICADOS\n';
      csv += 'Columna,Método,Total Imputados\n';
      Object.entries(reporte.métodos_aplicados).forEach(([col, meta]) => {
        csv += `"${col}","${meta.método}",${meta.total_imputados}\n`;
      });

      csv += '\nRECUPERACIÓN\n';
      csv += `Reglas Clínicas,${reporte.recuperación.registros_recuperados_por_reglas_clínicas}\n`;
      csv += `Imputación Estadística,${reporte.recuperación.registros_recuperados_por_imputación_estadística}\n`;
      csv += `Total Imputaciones,${reporte.recuperación.total_imputaciones_realizadas}\n`;

      csv += '\nMÉTRICAS DE CALIDAD\n';
      csv += `Completitud Final,${reporte.métricas_calidad.porcentaje_completitud_final}%\n`;
      csv += `Mejora en Completitud,+${reporte.métricas_calidad.mejora_completitud}%\n`;

      return csv;
    },

    generarHTML(reporte, tandaID) {
      return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reporte de Imputación</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
            h1, h2, h3 { color: #2c3e50; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #34495e; color: white; padding: 12px; text-align: left; }
            td { padding: 10px; border-bottom: 1px solid #bdc3c7; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #ecf0f1; border-radius: 4px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #3498db; }
            .metric-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📊 REPORTE DE IMPUTACIÓN DE VALORES NULOS</h1>
            <p><strong>Fecha:</strong> ${reporte.fecha_procesamiento}</p>
            <p><strong>Total Registros:</strong> ${reporte.total_registros_procesados}</p>

            <h2>Nulos Detectados</h2>
            <table>
              <tr>
                <th>Columna</th>
                <th>Nulos</th>
                <th>Porcentaje</th>
                <th>Válidos</th>
              </tr>
              ${reporte.resumen_nulos.columnas_con_nulos.map(col => `
                <tr>
                  <td>${col.columna}</td>
                  <td>${col.nulos_encontrados}</td>
                  <td>${col.porcentaje}%</td>
                  <td>${col.valores_válidos}</td>
                </tr>
              `).join('')}
            </table>

            <h2>Métricas de Calidad</h2>
            <div class="metric">
              <div class="metric-value">${reporte.métricas_calidad.porcentaje_completitud_final}%</div>
              <div class="metric-label">Completitud Final</div>
            </div>
            <div class="metric">
              <div class="metric-value">+${reporte.métricas_calidad.mejora_completitud}%</div>
              <div class="metric-label">Mejora</div>
            </div>
            <div class="metric">
              <div class="metric-value">${reporte.recuperación.total_imputaciones_realizadas}</div>
              <div class="metric-label">Total Imputaciones</div>
            </div>
          </div>
        </body>
        </html>
      `;
    },

    obtenerFecha() {
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ALERTAS Y NOTIFICACIONES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const Notificaciones = {
    
    mostrarNotificación(mensaje, tipo = 'info', duracion = 4000) {
      const colores = {
        'success': '#2ecc71',
        'error': '#e74c3c',
        'warning': '#f39c12',
        'info': '#3498db'
      };

      const notif = document.createElement('div');
      notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colores[tipo] || colores['info']};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10001;
        animation: slideIn 0.3s ease;
      `;
      notif.textContent = mensaje;

      document.body.appendChild(notif);

      if (duracion > 0) {
        setTimeout(() => notif.remove(), duracion);
      }
    },

    mostrarProgreso(mensaje) {
      const prog = document.createElement('div');
      prog.className = 'notif-progreso';
      prog.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        z-index: 10001;
      `;
      prog.textContent = `⏳ ${mensaje}`;
      document.body.appendChild(prog);
      return prog;
    },

    ocultarProgreso(elemento) {
      if (elemento) elemento.remove();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. INTERFAZ PÚBLICA
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    Visualizador,
    Descargador,
    Notificaciones,

    /**
     * API Principal: Ejecutar imputación completa con UI
     */
    async ejecutarImputaciónCompleta(tandaID) {
      if (!window.PatientImportManager) {
        Notificaciones.mostrarNotificación('Gestor de pacientes no disponible', 'error');
        return;
      }

      // Mostrar progreso
      const progreso = Notificaciones.mostrarProgreso('Analizando valores nulos...');

      try {
        // Paso 1: Analizar nulos
        const análisis = window.PatientImportManager.analizarNulos(tandaID);
        if (!análisis.exitosa) {
          throw new Error(análisis.error);
        }

        // Mostrar resumen de nulos si existen
        if (análisis.resumen.columnas_afectadas > 0) {
          Notificaciones.mostrarNotificación(
            `Detectados nulos en ${análisis.resumen.columnas_afectadas} columnas`,
            'warning'
          );
        }

        // Paso 2: Ejecutar imputación
        Notificaciones.ocultarProgreso(progreso);
        const progreso2 = Notificaciones.mostrarProgreso('Ejecutando imputación automática...');

        const resultadoImputación = await window.PatientImportManager.imputarNulos(tandaID);
        
        Notificaciones.ocultarProgreso(progreso2);

        if (!resultadoImputación.exitosa) {
          throw new Error(resultadoImputación.error);
        }

        // Mostrar reporte
        Notificaciones.mostrarNotificación(
          resultadoImputación.mensaje,
          'success'
        );

        // Mostrar reporte en modal
        this.Visualizador.mostrarReporteEnModal(
          resultadoImputación.reporte,
          tandaID
        );

      } catch (error) {
        Notificaciones.ocultarProgreso(progreso);
        Notificaciones.mostrarNotificación(
          `Error: ${error.message}`,
          'error',
          6000
        );
        console.error('Error en imputación:', error);
      }
    },

    /**
     * API: Mostrar análisis rápido de nulos
     */
    mostrarAnálisisRápido(tandaID) {
      const análisis = window.PatientImportManager?.analizarNulos(tandaID);
      
      if (!análisis || !análisis.exitosa) {
        Notificaciones.mostrarNotificación('No se pudo analizar los datos', 'error');
        return;
      }

      const mensaje = `
Análisis de Nulos:
- Columnas afectadas: ${análisis.resumen.columnas_afectadas}
- Total nulos: ${análisis.resumen.total_nulos_encontrados}
- Recomendación: ${análisis.resumen.recomendación}
      `;

      alert(mensaje);
    }
  };

})();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.NullValueImputationUI = NullValueImputationUI;
}
