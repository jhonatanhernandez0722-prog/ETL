const fs = require('fs');

global.window = global;
global.localStorage = {
  getItem() {
    return null;
  },
  setItem() {}
};

eval(fs.readFileSync('patient-import-manager.js', 'utf8'));

const base = {
  nombres: 'Prueba',
  apellidos: 'Extrema',
  edad: 45,
  sexo: 'Femenino',
  peso: 85,
  altura: 1.7,
  presion_sistolica: 120,
  presion_diastolica: 80,
  glucosa: 95,
  colesterol: 180,
  saturacion_oxigeno: 98,
  temperatura: 36.8,
  antecedentes_familiares: 'Ninguno',
  fumador: 'No',
  consumo_alcohol: 'No',
  actividad_fisica: 'Moderada',
  diagnostico_preliminar: 'Normal',
  riesgo_enfermedad: 'Bajo',
  fecha_consulta: '2024-01-15',
  frecuencia_cardiaca: 72
};

function validar(cambios) {
  return window.PatientImportManager.Validador.validarRegistro({ ...base, ...cambios }, 1);
}

const casos = {
  extremos_altos: validar({
    altura: 175,
    presion_sistolica: 320,
    presion_diastolica: 210,
    glucosa: 750,
    colesterol: 1200,
    frecuencia_cardiaca: 320,
    temperatura: 98.6,
    saturacion_oxigeno: 980
  }),
  temperatura_f_sin_decimal: validar({ temperatura: 986 }),
  temperatura_k: validar({ temperatura: 310 }),
  temperatura_c_sin_decimal: validar({ temperatura: 368 }),
  temperatura_baja_convertida: validar({ temperatura: '28°C' }),
  spo2_imposible: validar({ saturacion_oxigeno: 101 })
};

const resumenValidaciones = Object.fromEntries(
  Object.entries(casos).map(([nombre, resultado]) => [nombre, {
    valido: resultado.valido,
    errores: resultado.errores,
    advertencias: resultado.advertencias,
    datos: {
      altura: resultado.datos.altura,
      temperatura: resultado.datos.temperatura,
      spo2: resultado.datos.saturacion_oxigeno,
      ps: resultado.datos.presion_sistolica,
      pd: resultado.datos.presion_diastolica,
      glucosa: resultado.datos.glucosa,
      colesterol: resultado.datos.colesterol,
      fc: resultado.datos.frecuencia_cardiaca
    }
  }])
);

const registrosCSVGrande = Array.from({ length: 1501 }, (_, indice) => ({
  ...base,
  nombres: `Prueba ${indice + 1}`
}));
const registrosConDuplicado = window.PatientImportManager.ProcesadorArchivos
  .aplicarReglasVolumenCSV([...registrosCSVGrande]);

const registrosCSV1551 = Array.from({ length: 1551 }, (_, indice) => ({
  ...base,
  nombres: `Control ${indice + 1}`
}));
const registrosConDuplicadoAutomatico = window.PatientImportManager.ProcesadorArchivos
  .aplicarReglasVolumenCSV([...registrosCSV1551]);

const registrosCSV1801 = Array.from({ length: 1801 }, (_, indice) => ({
  ...base,
  nombres: `Paciente ${indice + 1}`
}));
const registrosAjustados1801 = window.PatientImportManager.ProcesadorArchivos
  .aplicarReglasVolumenCSV([...registrosCSV1801]);

function crearResultadoValido(indice, extras = {}) {
  return {
    valido: true,
    errores: [],
    advertencias: [],
    indice,
    datos: {
      ...base,
      nombres: `Paciente ${indice}`,
      apellidos: 'Carga'
    },
    ...extras
  };
}

const resultados1801Validos = [
  ...Array.from({ length: 1801 }, (_, indice) => crearResultadoValido(indice + 1)),
  crearResultadoValido(1802, {
    duplicado_interno: true,
    marca_duplicado: { duplicadoCon: 0, tipo: 'duplicado_control_volumen', umbral: 1550 }
  })
];
const limitados1801 = window.PatientImportManager
  .aplicarLimiteRegistrosValidos(resultados1801Validos);
const resumen1801 = window.PatientImportManager.contarResumenValidacion(limitados1801);

const resultadosConDuplicados = [
  ...Array.from({ length: 1800 }, (_, indice) => crearResultadoValido(indice + 1)),
  ...Array.from({ length: 50 }, (_, indice) => crearResultadoValido(1801 + indice, {
    duplicado_interno: true,
    marca_duplicado: { duplicadoCon: indice, tipo: 'exacto_interno' }
  })),
  crearResultadoValido(1851, {
    duplicado_interno: true,
    marca_duplicado: { duplicadoCon: 0, tipo: 'duplicado_control_volumen', umbral: 1550 }
  })
];
const limitadosConDuplicados = window.PatientImportManager
  .aplicarLimiteRegistrosValidos(resultadosConDuplicados);
const resumenConDuplicados = window.PatientImportManager
  .contarResumenValidacion(limitadosConDuplicados);

console.log(JSON.stringify({
  validaciones: resumenValidaciones,
  csv_masivo: {
    registros_originales: registrosCSVGrande.length,
    registros_post_etl: registrosConDuplicado.length,
    no_agrega_duplicado: registrosConDuplicado.length === registrosCSVGrande.length
  },
  csv_1551: {
    registros_originales: registrosCSV1551.length,
    registros_post_etl: registrosConDuplicadoAutomatico.length,
    agrega_duplicado_automatico: registrosConDuplicadoAutomatico.length === registrosCSV1551.length + 1,
    duplicado_marcado: registrosConDuplicadoAutomatico.at(-1)._duplicado_generado_sistema === true
  },
  csv_1801: {
    registros_originales: registrosCSV1801.length,
    registros_post_etl: registrosAjustados1801.length,
    no_recorta_y_agrega_duplicado: registrosAjustados1801.length === registrosCSV1801.length + 1,
    validos_importables: resumen1801.validos,
    duplicados: resumen1801.posiblesDuplicados
  },
  csv_1850_con_50_duplicados: {
    validos_importables: resumenConDuplicados.validos,
    duplicados: resumenConDuplicados.posiblesDuplicados,
    conserva_duplicados_mas_automatico: resumenConDuplicados.posiblesDuplicados === 51
  }
}, null, 2));
