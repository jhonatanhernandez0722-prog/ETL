/**
 * DIAGNÓSTICO: FLUJO COMPLETO DE IMPORTACIÓN DE CAMPOS
 * 
 * Este archivo documenta dónde se pierden/transforman los datos en el proceso
 */

console.log('═══════════════════════════════════════════════════════════════════');
console.log('ANÁLISIS DE FLUJO DE DATOS - IMPORTACIÓN DE PACIENTES');
console.log('═══════════════════════════════════════════════════════════════════\n');

// PASO 1: REGISTRO DEL CSV
console.log('PASO 1: Registro Original del CSV (ejemplo_importacion_pacientes.csv)');
console.log('─────────────────────────────────────────────────────────────────');
const registroCSV = {
  nombres: 'Juan',
  apellidos: 'García López',
  edad: '45',
  sexo: 'Masculino',
  peso: '85',
  altura: '1.75',
  presion_sistolica: '138',
  presion_diastolica: '88',
  glucosa: '110',
  colesterol: '220',
  saturacion_oxigeno: '98',
  temperatura: '36.8',
  antecedentes_familiares: 'Hipertensión',
  fumador: 'Sí',
  consumo_alcohol: 'No',
  actividad_fisica: 'Moderada',
  diagnostico_preliminar: 'Hipertensión Stage 2',
  fecha_consulta: '2024-01-15'
};

console.log('Campos que vienen del CSV:');
Object.keys(registroCSV).forEach(k => {
  console.log(`  ✓ ${k}: "${registroCSV[k]}"`);
});

// PASO 2: VALIDACIÓN
console.log('\n\nPASO 2: Después de Validador.validarRegistro()');
console.log('─────────────────────────────────────────────────────────────────');
const registroValidado = {
  nombres: 'Juan',
  apellidos: 'García López',
  edad: 45,
  sexo: 'Masculino',
  peso: 85,
  altura: 1.75,
  presion_sistolica: 138,
  presion_diastolica: 88,
  glucosa: 110,
  colesterol: 220,
  saturacion_oxigeno: 98, // ← Preservado con nombre original
  temperatura: 36.8,
  antecedentes_familiares: 'Hipertensión',
  fumador: 1,
  consumo_alcohol: 0,
  actividad_fisica: 'Moderada',
  diagnostico_preliminar: 'Hipertensión Stage 2',
  riesgo_enfermedad: undefined, // ← No proporcionado
  imc: 27.76,
  fecha_consulta: '2024-01-15'
};

console.log('Campos después de validación:');
console.log(`  ✓ saturacion_oxigeno: ${registroValidado.saturacion_oxigeno} (PRESERVADO)`);
console.log(`  ✓ diagnostico_preliminar: "${registroValidado.diagnostico_preliminar}" (PRESERVADO)`);
console.log(`  ✓ antecedentes_familiares: "${registroValidado.antecedentes_familiares}" (PRESERVADO)`);
console.log(`  ⚠ riesgo_enfermedad: ${registroValidado.riesgo_enfermedad} (NO proporcionado)`);
console.log(`  ⚠ frecuencia_cardiaca: ${registroValidado.frecuencia_cardiaca} (NO proporcionado)`);

// PASO 3: NORMALIZACIÓN (EL PROBLEMA)
console.log('\n\nPASO 3: Después de NormalizadorCampos.normalizar()');
console.log('─────────────────────────────────────────────────────────────────');
const registroNormalizado = {
  nombres: 'Juan',
  apellidos: 'García López',
  edad: 45,
  sexo: 'Masculino',
  peso: 85,
  altura: 1.75,
  ps: 138, // ← Mapeado desde presion_sistolica
  presion_sistolica: undefined, // ← ELIMINADO (PROBLEMA!)
  pd: 88, // ← Mapeado desde presion_diastolica
  presion_diastolica: undefined, // ← ELIMINADO (PROBLEMA!)
  glucosa: 110,
  colesterol: 220,
  spo2: 98, // ← Mapeado desde saturacion_oxigeno
  saturacion_oxigeno: undefined, // ← ELIMINADO (PROBLEMA!)
  temperatura: 36.8,
  ant_fam: 'Hipertensión', // ← Mapeado desde antecedentes_familiares
  antecedentes_familiares: undefined, // ← ELIMINADO (PROBLEMA!)
  fumador: 1,
  consumo_alcohol: 0,
  actividad_fisica: 'Moderada',
  diagnostico: 'Hipertensión Stage 2', // ← Mapeado desde diagnostico_preliminar
  diagnostico_preliminar: undefined, // ← ELIMINADO (PROBLEMA!)
  riesgo_diagnostico: undefined, // ← Mapeado pero falta original
  imc: 27.76,
  fc: undefined, // ← NO proporcionado
  fecha_consulta: '2024-01-15'
};

console.log('⚠️  PROBLEMA: Mapeo destructivo');
console.log('Campos ELIMINADOS durante normalización:');
console.log(`  ✗ presion_sistolica → ELIMINADO (solo existe como ps)`);
console.log(`  ✗ presion_diastolica → ELIMINADO (solo existe como pd)`);
console.log(`  ✗ saturacion_oxigeno → ELIMINADO (solo existe como spo2)`);
console.log(`  ✗ diagnostico_preliminar → ELIMINADO (solo existe como diagnostico)`);
console.log(`  ✗ antecedentes_familiares → ELIMINADO (solo existe como ant_fam)`);

// PASO 4: COMPLETAR IMPORTACIÓN
console.log('\n\nPASO 4: En completarImportacion() - Creación del objeto paciente');
console.log('─────────────────────────────────────────────────────────────────');
const ps = parseFloat(registroNormalizado.ps) || 0; // 138
const pd = parseFloat(registroNormalizado.pd) || 0; // 88
const glucosa = parseFloat(registroNormalizado.glucosa) || 0; // 110
const spo2 = parseFloat(registroNormalizado.spo2) || 0; // 98
const fc = parseFloat(registroNormalizado.fc) || 0; // undefined → NaN → 0 (INCORRECTO!)

console.log('Valores extraídos para paciente:');
console.log(`  ps: ${ps} ✓`);
console.log(`  pd: ${pd} ✓`);
console.log(`  spo2: ${spo2} ✓`);
console.log(`  fc (frecuencia_cardiaca): ${fc}`);
console.log(`  Problema: fc debería ser undefined/null, no 0!`);

// PASO 5: RENDERIZACIÓN EN TABLA
console.log('\n\nPASO 5: En renderTable() - Visualización');
console.log('─────────────────────────────────────────────────────────────────');
const paciente = {
  ...registroNormalizado,
  ps: ps,
  pd: pd,
  spo2: spo2,
  glucosa: glucosa,
  fc: 0, // INCORRECTO - debería ser null o undefined
  // Otros campos...
};

const getSafeValue = (val, defaultText='Sin dato') => {
  if (val === null || val === undefined || val === '') return defaultText;
  return val;
};

console.log('Cómo aparecerían en la tabla:');
console.log(`  Columna PS: ${getSafeValue(paciente.ps)} ✓`);
console.log(`  Columna PD: ${getSafeValue(paciente.pd)} ✓`);
console.log(`  Columna SPO2: ${getSafeValue(paciente.spo2)} ✓`);
console.log(`  Columna FC: ${getSafeValue(paciente.fc)}`);
console.log(`  Problema: FC muestra "0" en lugar de "Sin dato"`);

// RESUMEN DE PROBLEMAS
console.log('\n\n═══════════════════════════════════════════════════════════════════');
console.log('PROBLEMAS IDENTIFICADOS');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('1. MAPEO DESTRUCTIVO en NormalizadorCampos.normalizar():');
console.log('   - Elimina campos originales después de mapearlos');
console.log('   - presion_sistolica desaparece (solo queda ps)');
console.log('   - saturacion_oxigeno desaparece (solo queda spo2)');
console.log('   - Esto rompe accesibilidad a datos originales\n');

console.log('2. PÉRDIDA DE VALORES NULL en parseFloat() con ||:');
console.log('   - parseFloat(null) → NaN');
console.log('   - parseFloat(undefined) → NaN');
console.log('   - NaN || 0 → 0 (incorrecto!)');
console.log('   - El usuario no sabe que fc es "falta dato" vs "0"\n');

console.log('3. CAMPOS QUE NO SE PRESERVAN COMPLETAMENTE:');
console.log('   - temperatura (solo valores con alertas)');
console.log('   - antecedentes_familiares (renombrado a ant_fam)');
console.log('   - actividad_fisica (no mostrado en tabla)');
console.log('   - riesgo_enfermedad (renombrado a riesgo_diagnostico)');
console.log('   - fecha_consulta (algunos casos no asignados)\n');

console.log('4. INCONSISTENCIA EN LA TABLA:');
console.log('   - algunos valores muestran correctamente');
console.log('   - otros muestran "undefined" o "0" incorrectamente');
console.log('   - sin distinguir entre "no proporcionado" vs "cero válido"\n');

// SOLUCIÓN PROPUESTA
console.log('═══════════════════════════════════════════════════════════════════');
console.log('SOLUCIÓN PROPUESTA');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('OPCIÓN A: Eliminar mapeo destructivo');
console.log('  - Mantener TODOS los campos originales (largo)');
console.log('  - Agregar aliases/propiedades derivadas (corto)');
console.log('  - Ventaja: No pierde datos');
console.log('  - Desventaja: Campos duplicados en memoria\n');

console.log('OPCIÓN B: Cambiar renderTable para acceder a nombres largos');
console.log('  - Dejar normalización como está');
console.log('  - Actualizar renderTable para usar nuevos nombres cortos');
console.log('  - Ventaja: Mapeo lógico');
console.log('  - Desventaja: Requiere actualizar todas las referencias\n');

console.log('OPCIÓN C (RECOMENDADO): Preservar completo sin eliminar');
console.log('  - NormalizadorCampos agrega propiedades derivadas SIN eliminar origina');
console.log('  - Registro tiene: presion_sistolica Y ps (ambas)');
console.log('  - completarImportacion() accede a nombres que realmente existen');
console.log('  - renderTable() usa nombres de forma consistente');
console.log('  - Ventaja: Compatibilidad total, sin pérdida de datos');
console.log('  - Desventaja: Algo de redundancia (pero aceptable)\n');

console.log('═══════════════════════════════════════════════════════════════════');
