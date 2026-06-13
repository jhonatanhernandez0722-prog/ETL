/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VALIDACIÓN DE MÓDULO DE IMPUTACIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Archivo de prueba simple - ejecutar en Node.js o consola del navegador
console.log('═══════════════════════════════════════════════════════════════');
console.log('VALIDACIÓN: Sistema de Imputación Automática');
console.log('═══════════════════════════════════════════════════════════════\n');

// TEST 1: Verificar que los módulos estén disponibles
console.log('TEST 1: Disponibilidad de módulos');
console.log('─────────────────────────────────');

if (typeof window !== 'undefined') {
  const modulosRequeridos = [
    'NullValueImputationEngine',
    'PatientImportManager',
    'NullValueImputationUI'
  ];
  
  modulosRequeridos.forEach(mod => {
    const disponible = window[mod] ? '✓' : '✗';
    console.log(`${disponible} window.${mod}`);
  });
} else {
  console.log('ℹ️  Ejecutando en Node.js - Skipped browser tests');
}

// TEST 2: Validar estructura del motor de imputación
console.log('\n\nTEST 2: Estructura de NullValueImputationEngine');
console.log('─────────────────────────────────────────────');

if (typeof NullValueImputationEngine !== 'undefined') {
  const componentes = [
    'DetectorNulos',
    'CalculadorEstadistico',
    'MotorReglasClínicas',
    'MotorImputación',
    'GeneradorReportes',
    'procesarDataset',
    'generarReporte',
    'analizarNulos'
  ];
  
  componentes.forEach(comp => {
    const existe = NullValueImputationEngine[comp] ? '✓' : '✗';
    console.log(`${existe} ${comp}`);
  });
} else {
  console.log('✗ NullValueImputationEngine no está disponible');
}

// TEST 3: Datos de prueba
console.log('\n\nTEST 3: Datos de Prueba');
console.log('─────────────────────────');

const datosTest = [
  {
    id: 1,
    nombre: 'Juan',
    edad: 45,
    peso: 75,
    altura: 1.75,
    presion_sistolica: 130,
    presion_diastolica: 85,
    glucosa: 95,
    frecuencia_cardiaca: null, // NULO
    saturacion_oxigeno: 98,
    temperatura: 36.5,
    colesterol: 180
  },
  {
    id: 2,
    nombre: 'María',
    edad: 52,
    peso: 65,
    altura: null, // NULO
    presion_sistolica: 140,
    presion_diastolica: 90,
    glucosa: null, // NULO
    frecuencia_cardiaca: 78,
    saturacion_oxigeno: 96,
    temperatura: 36.8,
    colesterol: 200
  },
  {
    id: 3,
    nombre: 'Pedro',
    edad: 35,
    peso: null, // NULO
    altura: 1.80,
    presion_sistolica: 120,
    presion_diastolica: 80,
    glucosa: 100,
    frecuencia_cardiaca: 72,
    saturacion_oxigeno: null, // NULO
    temperatura: 37.0,
    colesterol: 170
  }
];

console.log(`✓ Creados ${datosTest.length} registros de prueba`);
console.log(`  - Total de campos por registro: ${Object.keys(datosTest[0]).length}`);
console.log(`  - Nulos esperados: 4 (FC, altura, glucosa, peso, SpO2)`);

// TEST 4: Ejecutar análisis de nulos
if (typeof NullValueImputationEngine !== 'undefined') {
  console.log('\n\nTEST 4: Análisis de Valores Nulos');
  console.log('─────────────────────────────────');
  
  const análisis = NullValueImputationEngine.analizarNulos(datosTest);
  
  const columnasConNulos = Object.entries(análisis)
    .filter(([_, stats]) => stats.total_nulos > 0)
    .map(([col, stats]) => `${col} (${stats.total_nulos} nulos, ${stats.porcentaje_nulos}%)`);
  
  console.log(`✓ Análisis completado:`);
  columnasConNulos.forEach(col => console.log(`  - ${col}`));
  
  // TEST 5: Ejecutar imputación
  console.log('\n\nTEST 5: Ejecución de Imputación Automática');
  console.log('──────────────────────────────────────────');
  
  const resultado = NullValueImputationEngine.procesarDataset(datosTest, {
    aplicar_reglas_clínicas: true,
    método_numérico: 'auto'
  });
  
  if (resultado.registros_imputados && resultado.reporte) {
    console.log('✓ Imputación exitosa');
    console.log(`  - Registros imputados: ${resultado.registros_imputados.length}`);
    console.log(`  - Total imputaciones: ${resultado.reporte.recuperación.total_imputaciones_realizadas}`);
    console.log(`  - Por reglas clínicas: ${resultado.reporte.recuperación.registros_recuperados_por_reglas_clínicas}`);
    console.log(`  - Por estadística: ${resultado.reporte.recuperación.registros_recuperados_por_imputación_estadística}`);
    console.log(`  - Completitud final: ${resultado.reporte.métricas_calidad.porcentaje_completitud_final}%`);
    console.log(`  - Mejora: +${resultado.reporte.métricas_calidad.mejora_completitud}%`);
    
    // TEST 6: Ver historial de imputación
    console.log('\n\nTEST 6: Historial de Imputación por Registro');
    console.log('──────────────────────────────────────────');
    
    resultado.registros_imputados.forEach((reg, idx) => {
      if (reg._historial_imputación && reg._historial_imputación.length > 0) {
        console.log(`\n  Registro ${idx + 1} (${reg.nombre}):`);
        reg._historial_imputación.forEach(imp => {
          console.log(`    • ${imp.columna}: ${imp.método} → ${imp.valor_imputado} (${imp.confianza})`);
        });
      }
    });
    
  } else {
    console.log('✗ Error en imputación');
  }
}

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('✅ VALIDACIÓN COMPLETADA');
console.log('═══════════════════════════════════════════════════════════════\n');

// Exportar para Node.js si aplica
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    datosTest,
    validar: () => {
      const resultado = NullValueImputationEngine.procesarDataset(datosTest);
      return resultado;
    }
  };
}
