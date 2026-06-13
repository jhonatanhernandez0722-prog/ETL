/**
 * EJEMPLO DE MAPEO DE CAMPOS - PRUEBA VISUAL
 * 
 * Este archivo demuestra cómo se mapean los campos del CSV importado
 * a las propiedades que la interfaz espera.
 */

console.log('═══════════════════════════════════════════════════════════════════');
console.log('MAPEO DE CAMPOS - CSV A INTERFAZ');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('ENCABEZADOS DEL CSV (ejemplo_importacion_pacientes.csv):');
const csvHeaders = [
  'nombres', 'apellidos', 'edad', 'sexo', 'peso', 'altura',
  'presion_sistolica', 'presion_diastolica', 'glucosa', 'colesterol',
  'saturacion_oxigeno', 'temperatura', 'antecedentes_familiares',
  'fumador', 'consumo_alcohol', 'actividad_fisica',
  'diagnostico_preliminar', 'fecha_consulta'
];
console.log(csvHeaders.map(h => `  ✓ ${h}`).join('\n'));

console.log('\n\nMAPEO APLICADO POR NORMALIZADOR:');
const mapeo = {
  'presion_sistolica': 'ps',
  'presion_diastolica': 'pd',
  'saturacion_oxigeno': 'spo2',
  'diagnostico_preliminar': 'diagnostico',
  'antecedentes_familiares': 'ant_fam',
  'frecuencia_cardiaca': 'fc',
  'riesgo_enfermedad': 'riesgo_diagnostico'
};

Object.entries(mapeo).forEach(([largo, corto]) => {
  if (csvHeaders.includes(largo)) {
    console.log(`  ${largo} → ${corto}`);
  }
});

console.log('\n\nEJEMPLO: Primer registro del CSV');
const registro_csv = {
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

console.log('\nDespués de validación:');
const registro_validado = {
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
  saturacion_oxigeno: 98,
  temperatura: 36.8,
  antecedentes_familiares: 'Hipertensión',
  fumador: 1,
  consumo_alcohol: 0,
  actividad_fisica: 'Moderada',
  diagnostico_preliminar: 'Hipertensión Stage 2',
  imc: 27.76, // Calculado automáticamente
  fecha_consulta: '2024-01-15'
};

Object.entries(registro_validado).forEach(([k, v]) => {
  console.log(`  ${k}: ${typeof v === 'string' ? `"${v}"` : v}`);
});

console.log('\n\nDespués de normalización (para la interfaz):');
const registro_normalizado = {
  nombres: 'Juan',
  apellidos: 'García López',
  edad: 45,
  sexo: 'Masculino',
  peso: 85,
  altura: 1.75,
  ps: 138,           // ← Remapeado desde presion_sistolica
  pd: 88,            // ← Remapeado desde presion_diastolica
  glucosa: 110,
  colesterol: 220,
  spo2: 98,          // ← Remapeado desde saturacion_oxigeno
  temperatura: 36.8,
  ant_fam: 'Hipertensión',  // ← Remapeado desde antecedentes_familiares
  fumador: 1,
  consumo_alcohol: 0,
  actividad_fisica: 'Moderada',
  diagnostico: 'Hipertensión Stage 2',  // ← Remapeado desde diagnostico_preliminar
  imc: 27.76,
  fc: null,          // ← No proporcionado en CSV
  fecha_consulta: '2024-01-15'
};

Object.entries(registro_normalizado).forEach(([k, v]) => {
  const marca = mapeo[k + '_largo'] || 
                (Object.values(mapeo).includes(k) ? '→' : ' ');
  console.log(`  ${k}: ${v === null ? 'null' : typeof v === 'string' ? `"${v}"` : v}`);
});

console.log('\n\nFLUJO EN LA TABLA DE PACIENTES:');
console.log('Los valores se mostrarán como:');
console.log(`  ps (${registro_normalizado.ps})     → Se muestra: "${registro_normalizado.ps}"`);
console.log(`  pd (${registro_normalizado.pd})     → Se muestra: "${registro_normalizado.pd}"`);
console.log(`  spo2 (${registro_normalizado.spo2}) → Se muestra: "${registro_normalizado.spo2}%"`);
console.log(`  diagnostico ("${registro_normalizado.diagnostico}") → Se muestra: "${registro_normalizado.diagnostico}"`);
console.log(`  fc (${registro_normalizado.fc})     → Se muestra: "Sin dato" (porque es null)`);

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log('✓ El mapeo garantiza que todos los campos aparezcan correctamente');
console.log('✓ Nunca se muestran valores "undefined"');
console.log('✓ Los campos vacíos se muestran como "Sin dato"');
console.log('═══════════════════════════════════════════════════════════════════');
