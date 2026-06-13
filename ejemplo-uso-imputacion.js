/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EJEMPLO RÁPIDO: Uso del Sistema de Imputación
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Copiar y pegar en la consola del navegador (F12) para experimentar
 * O ejecutar desde archivo Node.js después de cargar los módulos
 */

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 1: Analizar Nulos en Datos de Prueba
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 EJEMPLO 1: Analizar Valores Nulos\n');

const pacientes = [
  { id: 1, nombre: 'Juan', edad: 45, peso: 75, altura: 1.75, presion_sistolica: 130, presion_diastolica: 85, glucosa: 95, frecuencia_cardiaca: null, saturacion_oxigeno: 98, temperatura: 36.5, colesterol: 180 },
  { id: 2, nombre: 'María', edad: 52, peso: 65, altura: null, presion_sistolica: 140, presion_diastolica: 90, glucosa: null, frecuencia_cardiaca: 78, saturacion_oxigeno: 96, temperatura: 36.8, colesterol: 200 },
  { id: 3, nombre: 'Pedro', edad: 35, peso: null, altura: 1.80, presion_sistolica: 120, presion_diastolica: 80, glucosa: 100, frecuencia_cardiaca: 72, saturacion_oxigeno: null, temperatura: 37.0, colesterol: 170 }
];

console.log('📋 Datos de prueba cargados:');
console.log(`   - ${pacientes.length} pacientes`);
console.log(`   - ${Object.keys(pacientes[0]).length} campos por paciente`);

// Analizar nulos
const análisis = NullValueImputationEngine.analizarNulos(pacientes);

console.log('\n🔍 Nulos Detectados:');
Object.entries(análisis).forEach(([col, stats]) => {
  if (stats.total_nulos > 0) {
    console.log(`   • ${col}: ${stats.total_nulos} nulos (${stats.porcentaje_nulos}%)`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 2: Ejecutar Imputación Automática
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n⚙️ EJEMPLO 2: Ejecutar Imputación Automática\n');

const resultado = NullValueImputationEngine.procesarDataset(pacientes, {
  aplicar_reglas_clínicas: true,
  método_numérico: 'auto'
});

console.log('✅ Imputación completada:');
console.log(`   • Total imputaciones: ${resultado.reporte.recuperación.total_imputaciones_realizadas}`);
console.log(`   • Por reglas clínicas: ${resultado.reporte.recuperación.registros_recuperados_por_reglas_clínicas}`);
console.log(`   • Por estadística: ${resultado.reporte.recuperación.registros_recuperados_por_imputación_estadística}`);
console.log(`   • Completitud final: ${resultado.reporte.métricas_calidad.porcentaje_completitud_final}%`);
console.log(`   • Mejora: +${resultado.reporte.métricas_calidad.mejora_completitud}%`);

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 3: Ver Historial de Imputación por Paciente
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n📝 EJEMPLO 3: Historial de Imputación por Paciente\n');

resultado.registros_imputados.forEach((reg, idx) => {
  if (reg._historial_imputación && reg._historial_imputación.length > 0) {
    console.log(`👤 Paciente: ${reg.nombre} (ID: ${reg.id})`);
    reg._historial_imputación.forEach(imp => {
      console.log(`   ✓ ${imp.columna}: ${imp.método}`);
      console.log(`     → Valor: ${typeof imp.valor_imputado === 'number' ? imp.valor_imputado.toFixed(2) : imp.valor_imputado}`);
      console.log(`     → Confianza: ${imp.confianza}`);
    });
    console.log('');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 4: Comparar Antes vs Después
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n📊 EJEMPLO 4: Comparación Antes vs Después\n');

console.log('ANTES:');
console.log(`├─ Nulos: ${Object.values(análisis).reduce((sum, s) => sum + s.total_nulos, 0)}`);
console.log(`├─ Completitud: ${((Object.values(análisis)[0].valores_validos / Object.values(análisis)[0].total_registros) * 100).toFixed(1)}%`);
console.log(`└─ Registros incompletos: 3 de 3`);

console.log('\nDESPUÉS:');
const nulos_después = resultado.registros_imputados.reduce((sum, reg) => {
  let n = 0;
  for (let key in reg) {
    if (!key.startsWith('_') && (reg[key] === null || reg[key] === undefined || reg[key] === '')) n++;
  }
  return sum + n;
}, 0);
console.log(`├─ Nulos: ${nulos_después}`);
console.log(`├─ Completitud: ${resultado.reporte.métricas_calidad.porcentaje_completitud_final}%`);
console.log(`└─ Registros completos: 3 de 3`);

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 5: Obtener Estadísticas de una Columna
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n📈 EJEMPLO 5: Estadísticas de Columnas Numéricas\n');

const columnasNuméricas = ['edad', 'peso', 'presion_sistolica', 'glucosa'];

columnasNuméricas.forEach(col => {
  const stats = NullValueImputationEngine.obtenerEstadísticasColumna(pacientes, col);
  if (stats) {
    console.log(`${col}:`);
    console.log(`├─ Media: ${stats.media}`);
    console.log(`├─ Mediana: ${stats.mediana}`);
    console.log(`├─ Rango: ${stats.mínimo} - ${stats.máximo}`);
    console.log(`└─ Desv. Estándar: ${stats.desviación_estándar}\n`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 6: Generar Reporte en Diferentes Formatos
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n📄 EJEMPLO 6: Generar Reportes en Múltiples Formatos\n');

console.log('📋 FORMATO JSON:');
const reporteJSON = NullValueImputationEngine.generarReporte(resultado.reporte, 'json');
console.log(typeof reporteJSON === 'string' ? reporteJSON.substring(0, 200) + '...' : 'Ver console.log(reporteJSON)');

console.log('\n📊 FORMATO CSV:');
const reporteCSV = NullValueImputationEngine.generarReporte(resultado.reporte, 'csv');
console.log(reporteCSV.split('\n').slice(0, 10).join('\n'));

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 7: Usar PatientImportManager (si está disponible)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n🔗 EJEMPLO 7: Integración con PatientImportManager\n');

if (window.PatientImportManager) {
  console.log('✓ PatientImportManager disponible');
  console.log('\nPara usar con una tanda:');
  console.log(`
  // 1. Analizar nulos
  const análisisUI = PatientImportManager.analizarNulos(tandaID);
  console.log(análisisUI.resumen);
  
  // 2. Ejecutar imputación
  const imputación = await PatientImportManager.imputarNulos(tandaID);
  console.log(imputación.reporte);
  
  // 3. Obtener reporte
  const reporte = PatientImportManager.obtenerReporteImputación(tandaID, 'json');
  console.log(reporte);
  `);
} else {
  console.log('ℹ️ PatientImportManager no disponible en este contexto');
}

// ═══════════════════════════════════════════════════════════════════════════
// EJEMPLO 8: Usar NullValueImputationUI (si está disponible en navegador)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n🎨 EJEMPLO 8: Interfaz de Usuario (en navegador)\n');

if (typeof window !== 'undefined' && window.NullValueImputationUI) {
  console.log('✓ NullValueImputationUI disponible');
  console.log('\nMétodos disponibles:');
  console.log(`
  // Ejecutar imputación con UI completa
  NullValueImputationUI.ejecutarImputaciónCompleta(tandaID);
  
  // Mostrar análisis rápido
  NullValueImputationUI.mostrarAnálisisRápido(tandaID);
  
  // Mostrar reporte en modal
  NullValueImputationUI.Visualizador.mostrarReporteEnModal(reporte, tandaID);
  
  // Descargar reporte
  NullValueImputationUI.Descargador.descargarReporte(reporte, 'json', tandaID);
  `);
} else {
  console.log('ℹ️ NullValueImputationUI no disponible en este contexto');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMARIO
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n\n' + '═'.repeat(70));
console.log('✅ EJEMPLOS COMPLETADOS');
console.log('═'.repeat(70));

console.log(`
📌 PRÓXIMOS PASOS:

1. En la interfaz web:
   ├─ Importa un archivo CSV con pacientes
   ├─ Selecciona la tanda en el dropdown
   ├─ Click en "Analizar Nulos"
   └─ Click en "Imputar Automáticamente"

2. En la consola (F12):
   ├─ Usa los ejemplos anteriores
   ├─ Experimenta con diferentes datos
   └─ Consulta la guía: GUIA_IMPUTACION_AUTOMATICA.md

3. Revisa los reportes:
   ├─ Modal con detalles
   ├─ Descarga JSON/CSV/HTML
   └─ Consulta historial en registros

📚 Documentación:
   → GUIA_IMPUTACION_AUTOMATICA.md (completa)
   → validar-imputacion.js (tests)

🔗 APIs Públicas:
   → NullValueImputationEngine.*
   → PatientImportManager.imputarNulos()
   → NullValueImputationUI.*
`);
