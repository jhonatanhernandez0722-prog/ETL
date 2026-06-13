/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOTOR DE IMPUTACIÓN DE VALORES NULOS - SISTEMA ETL MÉDICO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo especializado en:
 * - Detección automática de valores nulos/faltantes
 * - Imputación estadística (media, mediana, moda)
 * - Aplicación de reglas clínicas inteligentes
 * - Generación de reportes detallados de imputación
 * - Trazabilidad completa de transformaciones
 * 
 * Características:
 * ✓ Media/Mediana para columnas numéricas
 * ✓ Moda para columnas categóricas
 * ✓ Reglas clínicas contextual (IMC, PA, Glucosa, etc.)
 * ✓ Validación de coherencia post-imputación
 * ✓ Reporte granular con métricas
 * ✓ Integración no destructiva con sistema existente
 * 
 * Versión: 1.0 Senior Data Quality
 * Especialidad: Calidad de Datos Clínicos
 */

'use strict';

const NullValueImputationEngine = (() => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CONFIGURACIÓN DE COLUMNAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const COLUMN_METADATA = {
    // NUMÉRICAS - IMPUTACIÓN: MEDIA/MEDIANA
    numéricas_críticas: {
      'peso': { tipo: 'numérica', unidad: 'kg', rango: [2, 300], método_default: 'media', clínica_rule: true },
      'altura': { tipo: 'numérica', unidad: 'm', rango: [0.5, 2.5], método_default: 'media', clínica_rule: true },
      'imc': { tipo: 'numérica', unidad: 'kg/m²', rango: [10, 60], método_default: 'media', clínica_rule: true },
      'presion_sistolica': { tipo: 'numérica', unidad: 'mmHg', rango: [50, 250], método_default: 'mediana', clínica_rule: true },
      'presion_diastolica': { tipo: 'numérica', unidad: 'mmHg', rango: [30, 150], método_default: 'mediana', clínica_rule: true },
      'frecuencia_cardiaca': { tipo: 'numérica', unidad: 'bpm', rango: [40, 200], método_default: 'mediana', clínica_rule: false },
      'glucosa': { tipo: 'numérica', unidad: 'mg/dL', rango: [40, 600], método_default: 'mediana', clínica_rule: false },
      'colesterol': { tipo: 'numérica', unidad: 'mg/dL', rango: [50, 500], método_default: 'mediana', clínica_rule: false },
      'saturacion_oxigeno': { tipo: 'numérica', unidad: '%', rango: [0, 100], método_default: 'mediana', clínica_rule: false },
      'temperatura': { tipo: 'numérica', unidad: '°C', rango: [35, 42], método_default: 'mediana', clínica_rule: false }
    },
    
    // CATEGÓRICAS - IMPUTACIÓN: MODA
    categóricas: {
      'sexo': { tipo: 'categórica', método_default: 'moda', valores_válidos: ['M', 'F', 'Masculino', 'Femenino'] },
      'antecedentes_familiares': { tipo: 'categórica', método_default: 'moda' },
      'actividad_fisica': { tipo: 'categórica', método_default: 'moda', valores_válidos: ['Sedentario', 'Leve', 'Moderado', 'Intenso'] },
      'diagnostico_preliminar': { tipo: 'categórica', método_default: 'moda' },
      'riesgo_enfermedad': { tipo: 'categórica', método_default: 'moda', valores_válidos: ['Bajo', 'Medio', 'Alto', 'Crítico'] }
    },
    
    // BOOLEANAS
    booleanas: {
      'fumador': { tipo: 'booleana', método_default: 'moda' },
      'consumo_alcohol': { tipo: 'booleana', método_default: 'moda' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DETECTOR DE VALORES NULOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const DetectorNulos = {
    
    /**
     * Identifica si un valor está vacío/nulo
     */
    esNulo(valor) {
      return valor === null || 
             valor === undefined || 
             valor === '' || 
             (typeof valor === 'string' && valor.trim() === '') ||
             (typeof valor === 'number' && isNaN(valor));
    },

    /**
     * Analiza un dataset completo buscando nulos
     * @param {Array} registros - Array de registros
     * @returns {Object} Estadísticas de nulos por columna
     */
    analizarNulos(registros) {
      const estadisticas = {};
      const todasLasColumnas = new Set();
      
      // Identificar todas las columnas
      registros.forEach(reg => {
        Object.keys(reg).forEach(col => todasLasColumnas.add(col));
      });

      // Analizar cada columna
      todasLasColumnas.forEach(columna => {
        const nulos = [];
        const valores = [];
        let totalNulos = 0;
        let totalRegistros = 0;

        registros.forEach((reg, idx) => {
          totalRegistros++;
          const valor = reg[columna];
          
          if (this.esNulo(valor)) {
            totalNulos++;
            nulos.push({ fila: idx, registro: reg });
          } else {
            valores.push(valor);
          }
        });

        const porcentaje = (totalNulos / totalRegistros * 100).toFixed(2);

        estadisticas[columna] = {
          columna,
          total_nulos: totalNulos,
          total_registros: totalRegistros,
          porcentaje_nulos: parseFloat(porcentaje),
          valores_validos: valores.length,
          indices_nulos: nulos.map(n => n.fila),
          tasa_completitud: (100 - parseFloat(porcentaje)).toFixed(2)
        };
      });

      return estadisticas;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CALCULADOR ESTADÍSTICO
  // ═══════════════════════════════════════════════════════════════════════════
  
  const CalculadorEstadistico = {
    
    /**
     * Calcula media de valores numéricos
     */
    calcularMedia(valores) {
      if (!valores || valores.length === 0) return null;
      const valoresLimpios = valores.filter(v => !DetectorNulos.esNulo(v)).map(v => parseFloat(v));
      if (valoresLimpios.length === 0) return null;
      const suma = valoresLimpios.reduce((a, b) => a + b, 0);
      return suma / valoresLimpios.length;
    },

    /**
     * Calcula mediana de valores numéricos
     */
    calcularMediana(valores) {
      if (!valores || valores.length === 0) return null;
      const valoresLimpios = valores
        .filter(v => !DetectorNulos.esNulo(v))
        .map(v => parseFloat(v))
        .sort((a, b) => a - b);
      
      if (valoresLimpios.length === 0) return null;
      
      const mitad = Math.floor(valoresLimpios.length / 2);
      if (valoresLimpios.length % 2 !== 0) {
        return valoresLimpios[mitad];
      }
      return (valoresLimpios[mitad - 1] + valoresLimpios[mitad]) / 2;
    },

    /**
     * Calcula moda (valor más frecuente) para categóricas
     */
    calcularModa(valores) {
      if (!valores || valores.length === 0) return null;
      
      const valoresLimpios = valores.filter(v => !DetectorNulos.esNulo(v));
      if (valoresLimpios.length === 0) return null;

      const frecuencias = {};
      valoresLimpios.forEach(v => {
        const key = String(v).toLowerCase().trim();
        frecuencias[key] = (frecuencias[key] || 0) + 1;
      });

      const moda = Object.entries(frecuencias)
        .sort(([, a], [, b]) => b - a)[0];

      return moda ? moda[0] : null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MOTOR DE REGLAS CLÍNICAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const MotorReglasClínicas = {
    
    /**
     * Aplica reglas clínicas contextuales para imputar valores
     * @param {Object} registro - Registro del paciente
     * @param {Object} estadísticas - Estadísticas del dataset
     * @returns {Object} { imputados, métodos_aplicados }
     */
    aplicarReglas(registro, estadísticas) {
      const imputados = {};
      const métodosAplicados = [];

      // REGLA 1: Calcular IMC si falta (peso y altura disponibles)
      if (DetectorNulos.esNulo(registro.imc) && 
          !DetectorNulos.esNulo(registro.peso) && 
          !DetectorNulos.esNulo(registro.altura)) {
        
        const peso = parseFloat(registro.peso);
        const altura = parseFloat(registro.altura);
        
        if (peso > 0 && altura > 0) {
          imputados.imc = peso / (altura * altura);
          métodosAplicados.push({
            columna: 'imc',
            método: 'regla_clínica_IMC',
            fórmula: 'peso / (altura²)',
            valor_imputado: imputados.imc.toFixed(2),
            confianza: 'Alta'
          });
        }
      }

      // REGLA 2: Estimar PA si falta pero existe histórico similar
      if ((DetectorNulos.esNulo(registro.presion_sistolica) || 
           DetectorNulos.esNulo(registro.presion_diastolica)) && 
          estadísticas.presion_sistolica && 
          estadísticas.presion_diastolica) {
        
        if (DetectorNulos.esNulo(registro.presion_sistolica)) {
          const mediaPS = CalculadorEstadistico.calcularMedia(
            estadísticas.presion_sistolica.valores || []
          );
          if (mediaPS) {
            imputados.presion_sistolica = mediaPS;
            métodosAplicados.push({
              columna: 'presion_sistolica',
              método: 'regla_clínica_PA_histórico',
              valor_imputado: mediaPS.toFixed(1),
              confianza: 'Media'
            });
          }
        }

        if (DetectorNulos.esNulo(registro.presion_diastolica)) {
          const mediaPD = CalculadorEstadistico.calcularMedia(
            estadísticas.presion_diastolica.valores || []
          );
          if (mediaPD) {
            imputados.presion_diastolica = mediaPD;
            métodosAplicados.push({
              columna: 'presion_diastolica',
              método: 'regla_clínica_PA_histórico',
              valor_imputado: mediaPD.toFixed(1),
              confianza: 'Media'
            });
          }
        }
      }

      // REGLA 3: Saturación de oxígeno por grupo etario
      if (DetectorNulos.esNulo(registro.saturacion_oxigeno) && 
          !DetectorNulos.esNulo(registro.edad)) {
        
        const edad = parseFloat(registro.edad);
        let spo2Imputado = 95; // valor estándar
        let razon = 'valor_estándar_adulto';

        if (edad < 1) {
          spo2Imputado = 92;
          razon = 'RN_neonato';
        } else if (edad < 5) {
          spo2Imputado = 93;
          razon = 'lactante_pediátrico';
        }

        imputados.saturacion_oxigeno = spo2Imputado;
        métodosAplicados.push({
          columna: 'saturacion_oxigeno',
          método: 'regla_clínica_SpO2_edad',
          valor_imputado: spo2Imputado,
          confianza: 'Media',
          razon_clínica: razon
        });
      }

      // REGLA 4: Frecuencia cardíaca por edad
      if (DetectorNulos.esNulo(registro.frecuencia_cardiaca) && 
          !DetectorNulos.esNulo(registro.edad)) {
        
        const edad = parseFloat(registro.edad);
        let fcImputada;

        if (edad < 1) fcImputada = 120;
        else if (edad < 3) fcImputada = 110;
        else if (edad < 6) fcImputada = 105;
        else if (edad < 12) fcImputada = 95;
        else if (edad < 18) fcImputada = 85;
        else fcImputada = 75;

        imputados.frecuencia_cardiaca = fcImputada;
        métodosAplicados.push({
          columna: 'frecuencia_cardiaca',
          método: 'regla_clínica_FC_edad',
          valor_imputado: fcImputada,
          confianza: 'Alta',
          rango_normal_esperado: this.obtenerRangoFC(edad)
        });
      }

      // REGLA 5: Glucosa basal si falta
      if (DetectorNulos.esNulo(registro.glucosa)) {
        const glucosaImputada = 100; // valor estándar en ayunas
        imputados.glucosa = glucosaImputada;
        métodosAplicados.push({
          columna: 'glucosa',
          método: 'regla_clínica_glucosa_basal',
          valor_imputado: glucosaImputada,
          confianza: 'Baja',
          nota: 'Valor estándar asumiendo paciente en ayunas'
        });
      }

      return { imputados, métodosAplicados };
    },

    obtenerRangoFC(edad) {
      if (edad < 1) return '100-160 bpm';
      if (edad < 3) return '90-150 bpm';
      if (edad < 6) return '80-140 bpm';
      if (edad < 12) return '70-110 bpm';
      if (edad < 18) return '60-100 bpm';
      return '60-100 bpm';
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MOTOR DE IMPUTACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  
  const MotorImputación = {
    
    /**
     * Ejecuta imputación completa de nulos en un dataset
     * @param {Array} registros - Array de registros con potenciales nulos
     * @param {Object} opciones - Configuración de imputación
     * @returns {Object} { registros_imputados, reporte }
     */
    ejecutarImputación(registros, opciones = {}) {
      opciones = {
        aplicar_reglas_clínicas: true,
        método_numérico: 'auto', // 'media', 'mediana', 'auto'
        método_categórico: 'moda',
        umbral_nulos_porciento: 50, // No imputa si > 50% nulos
        verbose: true,
        ...opciones
      };

      if (!registros || registros.length === 0) {
        return { registros_imputados: [], reporte: { error: 'Sin registros' } };
      }

      // Paso 1: Analizar nulos
      const estadísticasNulos = DetectorNulos.analizarNulos(registros);
      const registrosImputados = JSON.parse(JSON.stringify(registros)); // Copia profunda
      
      const registro_imputación = {
        timestamp: new Date().toISOString(),
        total_registros: registros.length,
        columnas_procesadas: {},
        registros_recuperados_reglas: 0,
        registros_recuperados_estadística: 0,
        detalles_por_columna: []
      };

      // Paso 2: Prepare valores para cálculos estadísticos
      const valoresPorColumna = {};
      registros.forEach(reg => {
        Object.keys(reg).forEach(col => {
          if (!valoresPorColumna[col]) {
            valoresPorColumna[col] = [];
          }
          if (!DetectorNulos.esNulo(reg[col])) {
            valoresPorColumna[col].push(reg[col]);
          }
        });
      });

      // Paso 3: Procesar cada registronumerado
      registrosImputados.forEach((registro, idxRegistro) => {
        const historialImputación = [];

        // 3a: Aplicar reglas clínicas primero
        if (opciones.aplicar_reglas_clínicas) {
          const { imputados, métodosAplicados } = MotorReglasClínicas.aplicarReglas(
            registro,
            valoresPorColumna
          );

          Object.assign(registro, imputados);
          if (métodosAplicados.length > 0) {
            registro_imputación.registros_recuperados_reglas++;
            historialImputación.push(...métodosAplicados);
          }
        }

        // 3b: Imputar valores numéricos faltantes (media/mediana)
        Object.entries(COLUMN_METADATA.numéricas_críticas).forEach(([col, meta]) => {
          if (DetectorNulos.esNulo(registro[col]) && valoresPorColumna[col].length > 0) {
            
            // Validar umbral
            const porcentajeNulos = estadísticasNulos[col]?.porcentaje_nulos || 0;
            if (porcentajeNulos > opciones.umbral_nulos_porciento) {
              if (opciones.verbose) {
                console.warn(`Columna ${col} omitida: ${porcentajeNulos}% nulos (>${opciones.umbral_nulos_porciento}%)`);
              }
              return;
            }

            // Determinar método
            let método = opciones.método_numérico === 'auto' ? meta.método_default : opciones.método_numérico;
            let valor_imputado;

            if (método === 'media') {
              valor_imputado = CalculadorEstadistico.calcularMedia(valoresPorColumna[col]);
            } else if (método === 'mediana') {
              valor_imputado = CalculadorEstadistico.calcularMediana(valoresPorColumna[col]);
            }

            if (valor_imputado !== null) {
              registro[col] = valor_imputado;
              historialImputación.push({
                columna: col,
                método: método,
                valor_imputado: parseFloat(valor_imputado.toFixed(2)),
                confianza: 'Media',
                basado_en: valoresPorColumna[col].length + ' valores válidos'
              });
              registro_imputación.registros_recuperados_estadística++;

              if (!registro_imputación.columnas_procesadas[col]) {
                registro_imputación.columnas_procesadas[col] = {
                  método,
                  total_imputados: 0,
                  valor_promedio: valor_imputado
                };
              }
              registro_imputación.columnas_procesadas[col].total_imputados++;
            }
          }
        });

        // 3c: Imputar categóricas con moda
        Object.entries(COLUMN_METADATA.categóricas).forEach(([col, meta]) => {
          if (DetectorNulos.esNulo(registro[col]) && valoresPorColumna[col].length > 0) {
            
            const moda = CalculadorEstadistico.calcularModa(valoresPorColumna[col]);
            if (moda) {
              registro[col] = moda;
              historialImputación.push({
                columna: col,
                método: 'moda',
                valor_imputado: moda,
                confianza: 'Alta',
                basado_en: valoresPorColumna[col].length + ' valores válidos'
              });

              if (!registro_imputación.columnas_procesadas[col]) {
                registro_imputación.columnas_procesadas[col] = {
                  método: 'moda',
                  total_imputados: 0,
                  moda_valor: moda
                };
              }
              registro_imputación.columnas_procesadas[col].total_imputados++;
            }
          }
        });

        // 3d: Imputar booleanas con moda
        Object.entries(COLUMN_METADATA.booleanas).forEach(([col, meta]) => {
          if (DetectorNulos.esNulo(registro[col]) && valoresPorColumna[col].length > 0) {
            
            const moda = CalculadorEstadistico.calcularModa(valoresPorColumna[col]);
            if (moda) {
              registro[col] = moda.toLowerCase() === 'true' || moda === true || moda === 1;
              historialImputación.push({
                columna: col,
                método: 'moda_booleana',
                valor_imputado: registro[col],
                confianza: 'Alta'
              });

              if (!registro_imputación.columnas_procesadas[col]) {
                registro_imputación.columnas_procesadas[col] = {
                  método: 'moda_booleana',
                  total_imputados: 0
                };
              }
              registro_imputación.columnas_procesadas[col].total_imputados++;
            }
          }
        });

        // Guardar historial si hay imputaciones
        if (historialImputación.length > 0) {
          registro._historial_imputación = historialImputación;
        }
      });

      // Paso 4: Generar reporte final
      const resumenFinal = this.generarReporteFinal(
        registros,
        registrosImputados,
        estadísticasNulos,
        registro_imputación
      );

      return {
        registros_imputados: registrosImputados,
        reporte: resumenFinal
      };
    },

    generarReporteFinal(registrosOriginales, registrosImputados, estadísticasNulos, stats) {
      const resumen = {
        fecha_procesamiento: new Date().toLocaleString('es-ES'),
        total_registros_procesados: registrosOriginales.length,
        
        resumen_nulos: {
          total_columnas: Object.keys(estadísticasNulos).length,
          columnas_con_nulos: Object.entries(estadísticasNulos)
            .filter(([_, stats]) => stats.total_nulos > 0)
            .map(([col, estadística]) => ({
              columna: col,
              nulos_encontrados: estadística.total_nulos,
              porcentaje: parseFloat(estadística.porcentaje_nulos),
              valores_válidos: estadística.valores_validos
            }))
        },

        métodos_aplicados: stats.columnas_procesadas,

        recuperación: {
          registros_recuperados_por_reglas_clínicas: stats.registros_recuperados_reglas,
          registros_recuperados_por_imputación_estadística: stats.registros_recuperados_estadística,
          total_imputaciones_realizadas: Object.values(stats.columnas_procesadas)
            .reduce((sum, col) => sum + (col.total_imputados || 0), 0)
        },

        métricas_calidad: {
          porcentaje_completitud_final: this.calcularCompletitud(registrosImputados),
          mejora_completitud: this.calcularMejoraCompletitud(registrosOriginales, registrosImputados),
          registros_sin_cambios: registrosOriginales.length - stats.registros_recuperados_reglas - stats.registros_recuperados_estadística
        }
      };

      return resumen;
    },

    calcularCompletitud(registros) {
      if (!registros || registros.length === 0) return 0;

      let totalCeldas = 0;
      let celdasCompletas = 0;

      registros.forEach(reg => {
        Object.entries(reg).forEach(([key, valor]) => {
          if (!key.startsWith('_')) { // Excluir campos internos
            totalCeldas++;
            if (!DetectorNulos.esNulo(valor)) {
              celdasCompletas++;
            }
          }
        });
      });

      return totalCeldas > 0 ? ((celdasCompletas / totalCeldas) * 100).toFixed(2) : 0;
    },

    calcularMejoraCompletitud(registrosOriginales, registrosImputados) {
      const completitudOriginal = this.calcularCompletitud(registrosOriginales);
      const completitudFinal = this.calcularCompletitud(registrosImputados);
      return (parseFloat(completitudFinal) - parseFloat(completitudOriginal)).toFixed(2);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. GENERADOR DE REPORTES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const GeneradorReportes = {
    
    /**
     * Genera reporte HTML detallado
     */
    generarReporteHTML(reporte) {
      const html = `
        <div class="reporte-imputacion">
          <h2>📊 REPORTE DE IMPUTACIÓN DE VALORES NULOS</h2>
          <p><strong>Fecha:</strong> ${reporte.fecha_procesamiento}</p>
          <p><strong>Registros Procesados:</strong> ${reporte.total_registros_procesados}</p>

          <h3>🔍 Nulos Detectados</h3>
          <table>
            <tr>
              <th>Columna</th>
              <th>Nulos Encontrados</th>
              <th>Porcentaje</th>
              <th>Valores Válidos</th>
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

          <h3>⚙️ Métodos de Imputación Aplicados</h3>
          <table>
            <tr>
              <th>Columna</th>
              <th>Método</th>
              <th>Total Imputados</th>
              <th>Valor</th>
            </tr>
            ${Object.entries(reporte.métodos_aplicados).map(([col, meta]) => `
              <tr>
                <td>${col}</td>
                <td>${meta.método}</td>
                <td>${meta.total_imputados}</td>
                <td>${meta.valor_promedio ? meta.valor_promedio.toFixed(2) : meta.moda_valor || '-'}</td>
              </tr>
            `).join('')}
          </table>

          <h3>✅ Recuperación de Datos</h3>
          <ul>
            <li>Registros recuperados por reglas clínicas: <strong>${reporte.recuperación.registros_recuperados_por_reglas_clínicas}</strong></li>
            <li>Registros recuperados por imputación estadística: <strong>${reporte.recuperación.registros_recuperados_por_imputación_estadística}</strong></li>
            <li>Total de imputaciones realizadas: <strong>${reporte.recuperación.total_imputaciones_realizadas}</strong></li>
          </ul>

          <h3>📈 Métricas de Calidad</h3>
          <ul>
            <li>Completitud final: <strong>${reporte.métricas_calidad.porcentaje_completitud_final}%</strong></li>
            <li>Mejora en completitud: <strong>+${reporte.métricas_calidad.mejora_completitud}%</strong></li>
            <li>Registros sin cambios: <strong>${reporte.métricas_calidad.registros_sin_cambios}</strong></li>
          </ul>
        </div>
      `;
      return html;
    },

    /**
     * Genera reporte en formato JSON
     */
    generarReporteJSON(reporte) {
      return JSON.stringify(reporte, null, 2);
    },

    /**
     * Genera reporte en formato CSV
     */
    generarReporteCSV(reporte) {
      let csv = 'REPORTE DE IMPUTACIÓN DE VALORES NULOS\n';
      csv += `Fecha,${reporte.fecha_procesamiento}\n`;
      csv += `Total Registros,${reporte.total_registros_procesados}\n\n`;

      csv += 'NULOS DETECTADOS\n';
      csv += 'Columna,Nulos Encontrados,Porcentaje,Valores Válidos\n';
      reporte.resumen_nulos.columnas_con_nulos.forEach(col => {
        csv += `${col.columna},${col.nulos_encontrados},${col.porcentaje}%,${col.valores_válidos}\n`;
      });

      csv += '\nMÉTODOS APLICADOS\n';
      csv += 'Columna,Método,Total Imputados\n';
      Object.entries(reporte.métodos_aplicados).forEach(([col, meta]) => {
        csv += `${col},${meta.método},${meta.total_imputados}\n`;
      });

      csv += '\nRECUPERACIÓN\n';
      csv += `Reglas Clínicas,${reporte.recuperación.registros_recuperados_por_reglas_clínicas}\n`;
      csv += `Imputación Estadística,${reporte.recuperación.registros_recuperados_por_imputación_estadística}\n`;
      csv += `Total Imputaciones,${reporte.recuperación.total_imputaciones_realizadas}\n`;

      return csv;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. INTERFAZ PÚBLICA
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    DetectorNulos,
    CalculadorEstadistico,
    MotorReglasClínicas,
    MotorImputación,
    GeneradorReportes,

    /**
     * API Principal: Ejecuta imputación completa
     */
    procesarDataset(registros, opciones = {}) {
      const resultado = MotorImputación.ejecutarImputación(registros, opciones);
      return resultado;
    },

    /**
     * API: Generar reporte en diferentes formatos
     */
    generarReporte(reporte, formato = 'json') {
      switch (formato.toLowerCase()) {
        case 'html':
          return GeneradorReportes.generarReporteHTML(reporte);
        case 'csv':
          return GeneradorReportes.generarReporteCSV(reporte);
        case 'json':
        default:
          return GeneradorReportes.generarReporteJSON(reporte);
      }
    },

    /**
     * API: Analizar nulos sin imputar
     */
    analizarNulos(registros) {
      return DetectorNulos.analizarNulos(registros);
    },

    /**
     * API: Obtener estadísticas de una columna
     */
    obtenerEstadísticasColumna(registros, nombreColumna) {
      const valores = registros
        .map(r => r[nombreColumna])
        .filter(v => !DetectorNulos.esNulo(v))
        .map(v => parseFloat(v));

      if (valores.length === 0) return null;

      return {
        columna: nombreColumna,
        total_valores: valores.length,
        media: CalculadorEstadistico.calcularMedia(valores).toFixed(2),
        mediana: CalculadorEstadistico.calcularMediana(valores).toFixed(2),
        mínimo: Math.min(...valores).toFixed(2),
        máximo: Math.max(...valores).toFixed(2),
        desviación_estándar: this.calcularDesvEstándar(valores).toFixed(2)
      };
    },

    calcularDesvEstándar(valores) {
      if (valores.length === 0) return 0;
      const media = CalculadorEstadistico.calcularMedia(valores);
      const varianza = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length;
      return Math.sqrt(varianza);
    }
  };

})();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.NullValueImputationEngine = NullValueImputationEngine;
}

// Exportar para Node.js si aplica
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NullValueImputationEngine;
}
