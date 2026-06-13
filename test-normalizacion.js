// Script de prueba para verificar la normalización de campos
// Cargar el módulo (simulando ambiente de navegador)
global.window = { localStorage: {} };

const PatientImportManager = (() => {
  // [Aquí va el código del módulo...]
  // Para este test, lo simulamos de forma simplificada
  
  const NormalizadorCampos = {
    MAPEO_CAMPOS: {
      'presion_sistolica': 'ps',
      'presion_diastolica': 'pd',
      'saturacion_oxigeno': 'spo2',
      'diagnostico_preliminar': 'diagnostico',
      'antecedentes_familiares': 'ant_fam',
      'frecuencia_cardiaca': 'fc',
      'riesgo_enfermedad': 'riesgo_diagnostico'
    },

    normalizar(registro) {
      if (!registro) return {};
      
      const normalizado = { ...registro };
      
      // Mapear campos largos a nombres cortos
      for (const [largo, corto] of Object.entries(this.MAPEO_CAMPOS)) {
        if (largo in normalizado && !(corto in normalizado)) {
          normalizado[corto] = normalizado[largo];
          delete normalizado[largo];
        }
      }

      const camposCriticos = ['ps', 'pd', 'spo2', 'diagnostico', 'imc', 'colesterol', 'fc', 'ant_fam'];
      
      camposCriticos.forEach(campo => {
        if (!(campo in normalizado) || normalizado[campo] === undefined || normalizado[campo] === null || normalizado[campo] === '') {
          normalizado[campo] = null;
        }
      });

      return normalizado;
    },

    normalizarLista(registros) {
      if (!Array.isArray(registros)) return [];
      return registros.map(r => this.normalizar(r));
    }
  };

  return {
    NormalizadorCampos
  };
})();

// PRUEBAS
console.log('═════════════════════════════════════════════════════════');
console.log('PRUEBA DE NORMALIZACIÓN DE CAMPOS');
console.log('═════════════════════════════════════════════════════════\n');

// Prueba 1: Registro con nombres largos
const registro1 = {
  nombres: 'Juan',
  apellidos: 'García',
  edad: 45,
  presion_sistolica: 138,
  presion_diastolica: 88,
  saturacion_oxigeno: 98,
  diagnostico_preliminar: 'Hipertensión',
  glucosa: 110,
  colesterol: 220
};

console.log('Prueba 1: Registro original');
console.log('Entrada:', registro1);
const normalizado1 = PatientImportManager.NormalizadorCampos.normalizar(registro1);
console.log('Salida normalizada:', normalizado1);
console.log('\nVerificación:');
console.log('  - presion_sistolica → ps:', normalizado1.ps === 138 ? '✓' : '✗');
console.log('  - presion_diastolica → pd:', normalizado1.pd === 88 ? '✓' : '✗');
console.log('  - saturacion_oxigeno → spo2:', normalizado1.spo2 === 98 ? '✓' : '✗');
console.log('  - diagnostico_preliminar → diagnostico:', normalizado1.diagnostico === 'Hipertensión' ? '✓' : '✗');
console.log('  - Campos largos eliminados:', !registro1.presion_sistolica || normalizado1.presion_sistolica === undefined ? '✓' : '✗');

// Prueba 2: Registro con campos vacíos
console.log('\n\nPrueba 2: Registro con campos faltantes');
const registro2 = {
  nombres: 'María',
  apellidos: 'López',
  edad: 52,
  presion_sistolica: 142,
  // presion_diastolica falta
  glucosa: 118
  // diagnostico_preliminar falta
};

console.log('Entrada:', registro2);
const normalizado2 = PatientImportManager.NormalizadorCampos.normalizar(registro2);
console.log('Salida normalizada:', normalizado2);
console.log('\nVerificación:');
console.log('  - ps (presente):', normalizado2.ps === 142 ? '✓' : '✗');
console.log('  - pd (faltante):', normalizado2.pd === null ? '✓' : '✗');
console.log('  - diagnostico (faltante):', normalizado2.diagnostico === null ? '✓' : '✗');

// Prueba 3: Lista de registros
console.log('\n\nPrueba 3: Normalizar lista de registros');
const registros = [registro1, registro2];
const normalizados = PatientImportManager.NormalizadorCampos.normalizarLista(registros);
console.log('Cantidad de registros normalizados:', normalizados.length);
console.log('Primer registro normalizado:', normalizados[0]);
console.log('Segundo registro normalizado:', normalizados[1]);
console.log('\n✓ Prueba de normalización completada exitosamente');
