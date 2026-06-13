/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GESTOR DE IMPORTACIÓN Y VALIDACIÓN DE PACIENTES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Módulo especializado en:
 * - Importación masiva de pacientes desde CSV y Excel
 * - Validación clínica de datos
 * - Detección de duplicados
 * - Gestión de Tandas de Carga
 * - Cálculo automático de IMC
 * 
 * Campos soportados:
 * - Datos personales: nombres, apellidos, edad, sexo
 * - Antropométricos: peso, altura, IMC
 * - Vitales: presión sistólica, presión diastólica, frecuencia cardíaca
 * - Metabólicos: glucosa, colesterol
 * - Respiratorios: saturación de oxígeno (SpO₂), temperatura
 * - Riesgos: antecedentes familiares, fumador, alcohol, actividad física
 * - Clínicos: diagnóstico preliminar, riesgo de enfermedad, fecha de consulta
 */

'use strict';

const PatientImportManager = (() => {
  const MAX_VALIDOS_IMPORTACION = 1800;
  const UMBRAL_DUPLICADO_AUTOMATICO = 1550;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DEFINICIÓN DE CAMPOS Y MAPEOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const CAMPOS_PERMITIDOS = {
    // Identificación y demografía
    nombres: { tipo: 'string', obligatorio: true, alias: ['nombre', 'first_name', 'given_name'] },
    apellidos: { tipo: 'string', obligatorio: true, alias: ['surname', 'last_name', 'apellido'] },
    edad: { tipo: 'number', obligatorio: true, alias: ['age', 'años', 'years'] },
    sexo: { tipo: 'string', obligatorio: true, alias: ['gender', 'género'] },
    
    // Antropométricos
    peso: { tipo: 'number', obligatorio: false, alias: ['weight', 'peso_kg'] },
    altura: { tipo: 'number', obligatorio: false, alias: ['height', 'height_m', 'talla'] },
    imc: { tipo: 'number', obligatorio: false, alias: ['bmi', 'body_mass_index'] },
    
    // Vitales
    presion_sistolica: { tipo: 'number', obligatorio: true, alias: ['ps', 'systolic', 'presion_sys', 'presión_sistólica'] },
    presion_diastolica: { tipo: 'number', obligatorio: true, alias: ['pd', 'diastolic', 'presion_dia', 'presión_diastólica'] },
    frecuencia_cardiaca: { tipo: 'number', obligatorio: true, alias: ['fc', 'heart_rate', 'hr', 'pulso'] },
    temperatura: { tipo: 'number', obligatorio: true, alias: ['temp', 'temperatura_c'] },
    
    // Metabólicos
    glucosa: { tipo: 'number', obligatorio: true, alias: ['glucose', 'blood_sugar'] },
    colesterol: { tipo: 'number', obligatorio: true, alias: ['cholesterol', 'total_cholesterol'] },
    
    // Respiratorios
    saturacion_oxigeno: { tipo: 'number', obligatorio: true, alias: ['spo2', 'oxygen_saturation', 'o2_sat', 'saturación_oxígeno'] },
    
    // Factores de riesgo
    antecedentes_familiares: { tipo: 'string', obligatorio: true, alias: ['antecedentes', 'family_history'] },
    fumador: { tipo: 'boolean', obligatorio: true, alias: ['smoker', 'smoking_status', 'fuma'] },
    consumo_alcohol: { tipo: 'boolean', obligatorio: true, alias: ['alcohol', 'alcohol_use'] },
    actividad_fisica: { tipo: 'string', obligatorio: true, alias: ['physical_activity', 'exercise', 'actividad_física'] },
    
    // Clínicos
    diagnostico_preliminar: { tipo: 'string', obligatorio: true, alias: ['diagnosis', 'diag', 'diagnóstico', 'diagnóstico_preliminar'] },
    riesgo_enfermedad: { tipo: 'string', obligatorio: true, alias: ['disease_risk', 'risk_level', 'riesgo'] },
    fecha_consulta: { tipo: 'date', obligatorio: true, alias: ['consultation_date', 'fecha', 'date'] }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. VALIDADOR DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const Validador = {
    
    /**
     * Valida un registro de paciente
     * @returns { válido: boolean, errores: Array, advertencias: Array, datos: Object }
     */
    validarRegistro(registro, indice) {
      const resultado = {
        valido: true,
        errores: [],
        advertencias: [],
        datos: {},
        indice: indice
      };

      // Validar campos obligatorios
      if (!registro.nombres || registro.nombres.toString().trim() === '') {
        resultado.errores.push('Nombres requerido');
        resultado.valido = false;
      } else {
        resultado.datos.nombres = registro.nombres.toString().trim();
      }

      if (!registro.apellidos || registro.apellidos.toString().trim() === '') {
        resultado.errores.push('Apellidos requerido');
        resultado.valido = false;
      } else {
        resultado.datos.apellidos = registro.apellidos.toString().trim();
      }

      // Validar edad
      if (!registro.edad && registro.edad !== 0) {
        resultado.errores.push('Edad requerida');
        resultado.valido = false;
      } else {
        const edadParseada = this.normalizarNumero(registro.edad, {
          campo: 'Edad',
          min: 0,
          max: 150,
          maxInclusive: true,
          corregirDigitoFinal: true
        });
        const edad = edadParseada.valor;
        if (edadParseada.advertencia) resultado.advertencias.push(edadParseada.advertencia);
        if (edad === null || isNaN(edad) || edad < 0 || edad > 150) {
          resultado.errores.push(`Edad inválida: ${registro.edad}`);
          resultado.valido = false;
        } else {
          resultado.datos.edad = edad;
        }
      }

      // Validar sexo
      if (!registro.sexo || registro.sexo.toString().trim() === '') {
        resultado.errores.push('Sexo requerido');
        resultado.valido = false;
      } else {
        const sexoNormalizado = this.normalizarSexo(registro.sexo);
        if (!sexoNormalizado) {
          resultado.errores.push(`Sexo inválido: ${registro.sexo}`);
          resultado.valido = false;
        } else {
          resultado.datos.sexo = sexoNormalizado;
        }
      }

      // Validar peso y altura (OBLIGATORIO)
      if (!registro.peso) {
        resultado.errores.push('Peso requerido');
        resultado.valido = false;
      } else {
        const pesoParseado = this.normalizarNumero(registro.peso, {
          campo: 'Peso',
          min: 2,
          max: 300,
          maxInclusive: true,
          corregirDigitoFinal: true
        });
        const peso = pesoParseado.valor;
        if (pesoParseado.advertencia) resultado.advertencias.push(pesoParseado.advertencia);
        if (this.validarNumeroClinico(resultado, peso, registro.peso, {
          campo: 'Peso',
          unidad: ' kg',
          min: 2,
          minInclusive: true,
          maxEsperado: 300,
          maxOperativo: 600
        })) {
          resultado.datos.peso = peso;
        }
      }

      if (!registro.altura) {
        resultado.errores.push('Altura requerida');
        resultado.valido = false;
      } else {
        const alturaParseada = this.normalizarAltura(registro.altura);
        const altura = alturaParseada.valor;
        if (alturaParseada.advertencia) resultado.advertencias.push(alturaParseada.advertencia);
        if (this.validarNumeroClinico(resultado, altura, registro.altura, {
          campo: 'Altura',
          unidad: ' m',
          min: 0.5,
          minInclusive: true,
          maxEsperado: 2.5,
          maxOperativo: 3
        })) {
          resultado.datos.altura = altura;
        }
      }

      // Calcular o validar IMC
      if (resultado.datos.peso && resultado.datos.altura) {
        if (registro.imc) {
          const imcPropios = this.normalizarNumero(registro.imc, {
            campo: 'IMC',
            min: 0,
            max: 100,
            maxInclusive: false,
            corregirDigitoFinal: true
          }).valor;
          const imcCalculado = resultado.datos.peso / (resultado.datos.altura ** 2);
          if (imcPropios !== null && Math.abs(imcPropios - imcCalculado) > 0.5) {
            resultado.advertencias.push(`IMC inconsistente: proporcionado=${imcPropios}, calculado=${imcCalculado.toFixed(1)}`);
          }
          resultado.datos.imc = imcCalculado;
        } else {
          resultado.datos.imc = resultado.datos.peso / (resultado.datos.altura ** 2);
        }
      } else if (registro.imc) {
        const imcParseado = this.normalizarNumero(registro.imc, {
          campo: 'IMC',
          min: 0,
          max: 100,
          maxInclusive: false,
          corregirDigitoFinal: true
        });
        const imc = imcParseado.valor;
        if (imcParseado.advertencia) resultado.advertencias.push(imcParseado.advertencia);
        if (imc !== null && !isNaN(imc) && imc > 0 && imc <= 250) {
          if (imc > 100) {
            resultado.advertencias.push(`IMC muy alto (${imc}); se importó para revisión clínica`);
          }
          resultado.datos.imc = imc;
        }
      }

      // Validar presión arterial (CON Y SIN TILDES) - OBLIGATORIO
      const psValue = registro.presion_sistolica || registro['presión_sistólica'];
      const pdValue = registro.presion_diastolica || registro['presión_diastólica'];
      const tienePs = psValue !== undefined && psValue !== null && psValue !== '';
      const tienePd = pdValue !== undefined && pdValue !== null && pdValue !== '';
      let ps = null;
      let pd = null;

      if (!tienePs) {
        resultado.errores.push('Presión sistólica requerida');
        resultado.valido = false;
      } else {
        const psParseada = this.normalizarNumero(psValue, {
          campo: 'Presión sistólica',
          min: 0,
          max: 300,
          maxInclusive: false,
          correctionMin: 50,
          corregirDigitoFinal: true
        });
        ps = psParseada.valor;
        if (psParseada.advertencia) resultado.advertencias.push(psParseada.advertencia);
        if (ps === null || isNaN(ps)) {
          resultado.errores.push(`Presión sistólica inválida: ${psValue}`);
          resultado.valido = false;
        }
      }

      if (!tienePd) {
        resultado.errores.push('Presión diastólica requerida');
        resultado.valido = false;
      } else {
        const pdParseada = this.normalizarNumero(pdValue, {
          campo: 'Presión diastólica',
          min: 0,
          max: 200,
          maxInclusive: false,
          correctionMin: 30,
          corregirDigitoFinal: true
        });
        pd = pdParseada.valor;
        if (pdParseada.advertencia) resultado.advertencias.push(pdParseada.advertencia);
        if (pd === null || isNaN(pd)) {
          resultado.errores.push(`Presión diastólica inválida: ${pdValue}`);
          resultado.valido = false;
        }
      }

      if (ps !== null && pd !== null && !isNaN(ps) && !isNaN(pd)) {
        if (ps < pd) {
          const psOriginal = ps;
          ps = pd;
          pd = psOriginal;
          resultado.advertencias.push(`Presión arterial invertida corregida: ${psValue}/${pdValue} → ${ps}/${pd}`);
        }

        if (this.validarNumeroClinico(resultado, ps, psValue, {
          campo: 'Presión sistólica',
          unidad: ' mmHg',
          min: 0,
          maxEsperado: 300,
          maxOperativo: 450
        })) {
          resultado.datos.presion_sistolica = ps;
        }

        if (this.validarNumeroClinico(resultado, pd, pdValue, {
          campo: 'Presión diastólica',
          unidad: ' mmHg',
          min: 0,
          maxEsperado: 200,
          maxOperativo: 300
        })) {
          resultado.datos.presion_diastolica = pd;
        }
      }

      // Validar glucosa - OBLIGATORIO
      if (!registro.glucosa) {
        resultado.errores.push('Glucosa requerida');
        resultado.valido = false;
      } else {
        const glucParseada = this.normalizarNumero(registro.glucosa, {
          campo: 'Glucosa',
          min: 0,
          max: 600,
          maxInclusive: false,
          corregirDigitoFinal: true
        });
        const gluc = glucParseada.valor;
        if (glucParseada.advertencia) resultado.advertencias.push(glucParseada.advertencia);
        if (this.validarNumeroClinico(resultado, gluc, registro.glucosa, {
          campo: 'Glucosa',
          unidad: ' mg/dL',
          min: 0,
          maxEsperado: 600,
          maxOperativo: 2000
        })) {
          resultado.datos.glucosa = gluc;
        }
      }

      // Validar saturación de oxígeno (CON Y SIN TILDES) - OBLIGATORIO
      const spo2Value = registro.saturacion_oxigeno || registro['saturación_oxígeno'];
      if (!spo2Value) {
        resultado.errores.push('Saturación de oxígeno requerida');
        resultado.valido = false;
      } else {
          const spo2Parseada = this.normalizarPorcentaje(spo2Value, { campo: 'SpO₂' });
          const spo2 = spo2Parseada.valor;
          if (spo2Parseada.advertencia) resultado.advertencias.push(spo2Parseada.advertencia);
          if (spo2 !== null && !isNaN(spo2)) {
          if (spo2 < 0 || spo2 > 100) {
            resultado.errores.push(`SpO₂ debe estar entre 0-100%: ${spo2Value}`);
            resultado.valido = false;
          } else {
            resultado.datos.saturacion_oxigeno = spo2;
          }
        } else {
          resultado.errores.push(`SpO₂ inválida: ${spo2Value}`);
          resultado.valido = false;
        }
      }

      // Validar colesterol - OBLIGATORIO
      if (!registro.colesterol) {
        resultado.errores.push('Colesterol requerido');
        resultado.valido = false;
      } else {
        const colParseado = this.normalizarNumero(registro.colesterol, {
          campo: 'Colesterol',
          min: 0,
          max: 1000,
          maxInclusive: false,
          corregirDigitoFinal: true
        });
        const col = colParseado.valor;
        if (colParseado.advertencia) resultado.advertencias.push(colParseado.advertencia);
        if (this.validarNumeroClinico(resultado, col, registro.colesterol, {
          campo: 'Colesterol',
          unidad: ' mg/dL',
          min: 0,
          maxEsperado: 1000,
          maxOperativo: 3000
        })) {
          resultado.datos.colesterol = col;
        }
      }

      // Validar frecuencia cardíaca - OBLIGATORIO
      if (!registro.frecuencia_cardiaca) {
        resultado.errores.push('Frecuencia cardíaca requerida');
        resultado.valido = false;
      } else {
        const fcParseada = this.normalizarNumero(registro.frecuencia_cardiaca, {
          campo: 'Frecuencia cardíaca',
          min: 0,
          max: 300,
          maxInclusive: false,
          correctionMin: 30,
          corregirDigitoFinal: true
        });
        const fc = fcParseada.valor;
        if (fcParseada.advertencia) resultado.advertencias.push(fcParseada.advertencia);
        if (this.validarNumeroClinico(resultado, fc, registro.frecuencia_cardiaca, {
          campo: 'Frecuencia cardíaca',
          unidad: ' lpm',
          min: 0,
          maxEsperado: 300,
          maxOperativo: 500
        })) {
          resultado.datos.frecuencia_cardiaca = fc;
        }
      }

      // Validar temperatura (OBLIGATORIO)
      if (!registro.temperatura && !registro['temp'] && !registro['temperatura_c']) {
        resultado.errores.push('Temperatura requerida');
        resultado.valido = false;
      } else {
        const tempValue = registro.temperatura || registro['temp'] || registro['temperatura_c'];
        const tempParseada = this.normalizarTemperatura(tempValue);
        const temp = tempParseada.valor;
        if (tempParseada.advertencias) resultado.advertencias.push(...tempParseada.advertencias);
        if (temp === null || isNaN(temp) || temp < 30 || temp > 45) {
          resultado.errores.push(`Temperatura inválida: ${tempValue}°C`);
          resultado.valido = false;
        } else {
          if (temp < 35 || temp > 42) {
            resultado.advertencias.push(`Temperatura fuera de rango esperado (${temp.toFixed(1)} °C); se importó para revisión clínica`);
          }
          resultado.datos.temperatura = temp;
        }
      }

      // Validar antecedentes familiares (OBLIGATORIO)
      if (!registro.antecedentes_familiares || registro.antecedentes_familiares.toString().trim() === '') {
        resultado.errores.push('Antecedentes familiares requeridos');
        resultado.valido = false;
      } else {
        resultado.datos.antecedentes_familiares = registro.antecedentes_familiares.toString().trim();
      }

      // Validar actividad física (OBLIGATORIO)
      if (!registro.actividad_fisica && !registro['actividad_física']) {
        resultado.errores.push('Actividad física requerida');
        resultado.valido = false;
      } else {
        resultado.datos.actividad_fisica = (registro.actividad_fisica || registro['actividad_física']).toString().trim();
      }

      // Validar diagnóstico preliminar (OBLIGATORIO)
      if (!registro.diagnostico_preliminar && !registro['diagnóstico_preliminar']) {
        resultado.errores.push('Diagnóstico preliminar requerido');
        resultado.valido = false;
      } else {
        resultado.datos.diagnostico_preliminar = (registro.diagnostico_preliminar || registro['diagnóstico_preliminar']).toString().trim();
      }

      // Validar riesgo de enfermedad (OBLIGATORIO)
      if (!registro.riesgo_enfermedad || registro.riesgo_enfermedad.toString().trim() === '') {
        resultado.errores.push('Riesgo de enfermedad requerido');
        resultado.valido = false;
      } else {
        resultado.datos.riesgo_enfermedad = registro.riesgo_enfermedad.toString().trim();
      }

      // Validar fumador (OBLIGATORIO)
      if (registro.fumador === undefined || registro.fumador === null || registro.fumador === '') {
        resultado.errores.push('Estado de fumador requerido');
        resultado.valido = false;
      } else {
        const fumador = this.normalizarBooleano(registro.fumador);
        if (fumador === null) {
          resultado.errores.push(`Estado de fumador inválido: ${registro.fumador}`);
          resultado.valido = false;
        } else {
          resultado.datos.fumador = fumador ? 1 : 0;
        }
      }

      // Validar consumo de alcohol (OBLIGATORIO)
      if (registro.consumo_alcohol === undefined || registro.consumo_alcohol === null || registro.consumo_alcohol === '') {
        resultado.errores.push('Consumo de alcohol requerido');
        resultado.valido = false;
      } else {
        const alcohol = this.normalizarBooleano(registro.consumo_alcohol);
        if (alcohol === null) {
          resultado.errores.push(`Consumo de alcohol inválido: ${registro.consumo_alcohol}`);
          resultado.valido = false;
        } else {
          resultado.datos.consumo_alcohol = alcohol ? 1 : 0;
        }
      }

      // Validar fecha de consulta (OBLIGATORIO)
      if (!registro.fecha_consulta) {
        resultado.errores.push('Fecha de consulta requerida');
        resultado.valido = false;
      } else {
        const fecha = this.normalizarFecha(registro.fecha_consulta);
        if (fecha) {
          resultado.datos.fecha_consulta = fecha;
        } else {
          resultado.errores.push(`Fecha de consulta inválida: ${registro.fecha_consulta}`);
          resultado.valido = false;
        }
      }

      return resultado;
    },

    normalizarNumero(valor, opciones = {}) {
      const numero = this.parsearNumero(valor);
      const resultado = { valor: numero, advertencia: null };

      if (numero === null || isNaN(numero)) return resultado;

      const max = opciones.max;
      const maxInclusive = opciones.maxInclusive !== false;
      const fueraPorAlto = max !== undefined && (maxInclusive ? numero > max : numero >= max);

      if (opciones.corregirDigitoFinal && fueraPorAlto) {
        const corregido = this.corregirDigitoFinalRepetido(valor, {
          min: opciones.correctionMin ?? opciones.min ?? -Infinity,
          max,
          maxInclusive
        });

        if (corregido !== null) {
          resultado.valor = corregido;
          resultado.advertencia = `${opciones.campo || 'Valor'} con dígito final repetido corregido: ${valor} → ${corregido}`;
        }
      }

      return resultado;
    },

    validarNumeroClinico(resultado, valor, valorOriginal, opciones = {}) {
      const {
        campo = 'Valor',
        unidad = '',
        min,
        minInclusive = false,
        maxEsperado,
        maxOperativo
      } = opciones;

      if (valor === null || isNaN(valor)) {
        resultado.errores.push(`${campo} inválido: ${valorOriginal}`);
        resultado.valido = false;
        return false;
      }

      if (min !== undefined) {
        const fueraPorBajo = minInclusive ? valor < min : valor <= min;
        if (fueraPorBajo) {
          resultado.errores.push(`${campo} inválido: ${valorOriginal}${unidad}`);
          resultado.valido = false;
          return false;
        }
      }

      if (maxOperativo !== undefined && valor > maxOperativo) {
        resultado.errores.push(`${campo} fuera de rango operativo: ${valor}${unidad}`);
        resultado.valido = false;
        return false;
      }

      if (maxEsperado !== undefined && valor > maxEsperado) {
        resultado.advertencias.push(`${campo} muy alto (${valor}${unidad}); se importó para revisión clínica`);
      }

      return true;
    },

    normalizarAltura(valor) {
      const numero = this.parsearNumero(valor);
      const resultado = { valor: numero, advertencia: null };
      if (numero === null || isNaN(numero)) return resultado;

      if (numero > 3 && numero <= 300) {
        resultado.valor = numero / 100;
        resultado.advertencia = `Altura convertida de centímetros a metros: ${valor} → ${resultado.valor.toFixed(2)} m`;
      } else if (numero > 300 && numero <= 2500) {
        resultado.valor = numero / 1000;
        resultado.advertencia = `Altura convertida de milímetros a metros: ${valor} → ${resultado.valor.toFixed(2)} m`;
      }

      return resultado;
    },

    normalizarTemperatura(valor) {
      const numero = this.parsearNumero(valor);
      const resultado = { valor: numero, advertencias: [] };
      if (numero === null || isNaN(numero)) return resultado;

      const texto = valor.toString().toLowerCase();
      const corregido = this.corregirDigitoFinalRepetido(valor, {
        min: 30,
        max: 45,
        maxInclusive: true
      });

      if (corregido !== null) {
        resultado.valor = corregido;
        resultado.advertencias.push(`Temperatura con dígito final repetido corregido: ${valor} → ${corregido} °C`);
        return resultado;
      }

      if (/(^|\s)f\b|fahrenheit|°f/.test(texto) || (numero >= 95 && numero <= 115)) {
        resultado.valor = (numero - 32) * 5 / 9;
        resultado.advertencias.push(`Temperatura convertida de Fahrenheit a Celsius: ${valor} → ${resultado.valor.toFixed(1)} °C`);
      } else if (numero >= 950 && numero <= 1150) {
        const fahrenheit = numero / 10;
        resultado.valor = (fahrenheit - 32) * 5 / 9;
        resultado.advertencias.push(`Temperatura convertida de Fahrenheit sin decimal: ${valor} → ${resultado.valor.toFixed(1)} °C`);
      } else if (numero >= 28 && numero < 35) {
        resultado.valor = numero * 1.25;
        resultado.advertencias.push(`Temperatura convertida de escala Réaumur a Celsius: ${valor} → ${resultado.valor.toFixed(1)} °C`);
      } else if (/\b(k|kelvin)\b/.test(texto) || (numero > 250 && numero <= 330)) {
        resultado.valor = numero - 273.15;
        resultado.advertencias.push(`Temperatura convertida de Kelvin a Celsius: ${valor} → ${resultado.valor.toFixed(1)} °C`);
      } else if (numero >= 300 && numero <= 450) {
        resultado.valor = numero / 10;
        resultado.advertencias.push(`Temperatura con decimal omitido corregida: ${valor} → ${resultado.valor.toFixed(1)} °C`);
      }

      return resultado;
    },

    normalizarPorcentaje(valor, opciones = {}) {
      const numero = this.parsearNumero(valor);
      const resultado = { valor: numero, advertencia: null };
      if (numero === null || isNaN(numero)) return resultado;

      const campo = opciones.campo || 'Porcentaje';
      if (numero > 100 && numero <= 1000) {
        const corregido = numero / 10;
        if (corregido >= 50 && corregido <= 100) {
          resultado.valor = corregido;
          resultado.advertencia = `${campo} con decimal omitido corregido: ${valor} → ${resultado.valor}`;
        }
      } else if (numero > 1000 && numero <= 10000) {
        const corregido = numero / 100;
        if (corregido >= 50 && corregido <= 100) {
          resultado.valor = corregido;
          resultado.advertencia = `${campo} con dos decimales omitidos corregido: ${valor} → ${resultado.valor}`;
        }
      }

      return resultado;
    },

    parsearNumero(valor) {
      if (valor === null || valor === undefined || valor === '') return null;
      if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

      const texto = valor.toString().trim();
      if (!texto) return null;

      const textoDecimal = texto.replace(',', '.');
      const numeroEnTexto = textoDecimal.match(/-?\d+(?:\.\d+)?/);
      if (numeroEnTexto) {
        const numero = Number(numeroEnTexto[0]);
        return Number.isFinite(numero) ? numero : null;
      }

      return this.parsearNumeroEnPalabras(texto);
    },

    parsearNumeroEnPalabras(valor) {
      const texto = valor.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/-/g, ' ')
        .replace(/[^a-zñ\s]/g, ' ');

      const valores = {
        cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
        seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
        trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
        dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21,
        veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
        veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
        veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
        sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100,
        ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300,
        trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
        quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
        setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
        novecientos: 900, novecientas: 900
      };
      const ignorar = new Set(['y', 'de', 'del', 'mg', 'dl', 'mmhg', 'kg', 'm', 'cm', 'metro', 'metros', 'ano', 'anos', 'anio', 'anios']);
      const tokens = texto.split(/\s+/).filter(Boolean);
      let total = 0;
      let parcial = 0;
      let encontrado = false;

      for (const token of tokens) {
        if (ignorar.has(token)) continue;

        if (token === 'mil') {
          total += (parcial || 1) * 1000;
          parcial = 0;
          encontrado = true;
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(valores, token)) {
          parcial += valores[token];
          encontrado = true;
          continue;
        }

        if (encontrado) break;
        return null;
      }

      return encontrado ? total + parcial : null;
    },

    corregirDigitoFinalRepetido(valor, opciones = {}) {
      if (valor === null || valor === undefined) return null;

      const texto = valor.toString().trim().replace(',', '.');
      const numeroEnTexto = texto.match(/^-?\d+(?:\.\d+)?/);
      if (!numeroEnTexto || numeroEnTexto[0].includes('.')) return null;

      const numeroTexto = numeroEnTexto[0];
      const negativo = numeroTexto.startsWith('-');
      const digitos = negativo ? numeroTexto.slice(1) : numeroTexto;
      if (digitos.length < 3 || digitos.at(-1) !== digitos.at(-2)) return null;

      const corregidoTexto = `${negativo ? '-' : ''}${digitos.slice(0, -1)}`;
      const corregido = Number(corregidoTexto);
      const min = opciones.min ?? -Infinity;
      const max = opciones.max ?? Infinity;
      const maxInclusive = opciones.maxInclusive !== false;
      const dentroDeRango = corregido >= min && (maxInclusive ? corregido <= max : corregido < max);

      return Number.isFinite(corregido) && dentroDeRango ? corregido : null;
    },

    normalizarSexo(valor) {
      const normalizado = valor.toString().toLowerCase().trim();
      if (['m', 'masculino', 'male', 'hombre', 'h'].includes(normalizado)) return 'Masculino';
      if (['f', 'femenino', 'female', 'mujer'].includes(normalizado)) return 'Femenino';
      return null;
    },

    normalizarBooleano(valor) {
      const s = valor.toString().toLowerCase().trim();
      // Valores válidos: sí, si, yes, s, 1, true, verdadero, v (true)
      // Valores válidos: no, n, 0, false, falso, f (false)
      if (['sí', 'si', 'yes', 's', '1', 'true', 'verdadero', 'v'].includes(s)) {
        return true;
      } else if (['no', 'n', '0', 'false', 'falso', 'f'].includes(s)) {
        return false;
      }
      return null; // Inválido
    },

    normalizarFecha(valor) {
      if (!valor) return null;
      const fecha = new Date(valor);
      if (isNaN(fecha.getTime())) {
        // Intenta formatos comunes
        const partes = valor.toString().split(/[-/]/);
        if (partes.length === 3) {
          let d, m, y;
          // Intenta detectar el formato
          if (partes[0].length === 4) { // YYYY-MM-DD
            y = partes[0]; m = partes[1]; d = partes[2];
          } else if (partes[2].length === 4) { // DD-MM-YYYY o MM-DD-YYYY
            y = partes[2];
            // Asumir DD-MM-YYYY para América Latina
            d = partes[0]; m = partes[1];
          }
          if (y && m && d) {
            const f = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            if (!isNaN(f.getTime())) {
              return f.toISOString().split('T')[0];
            }
          }
        }
        return null;
      }
      return fecha.toISOString().split('T')[0];
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2.5. NORMALIZADOR DE CAMPOS PARA INTERFAZ
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Normaliza los nombres de campos de importación agregando alias cortos
   * SIN eliminar los campos originales (preservación completa de datos)
   */
  const NormalizadorCampos = {
    
    /**
     * Mapeo de campos largos a propiedades cortas esperadas por la interfaz
     * NO SE ELIMINAN LOS CAMPOS ORIGINALES - se agregan como propiedades derivadas
     * Incluye variantes CON y SIN tildes para compatibilidad con CSV
     */
    MAPEO_CAMPOS: {
      'presion_sistolica': 'ps',
      'presión_sistólica': 'ps',
      'presion_diastolica': 'pd',
      'presión_diastólica': 'pd',
      'saturacion_oxigeno': 'spo2',
      'saturación_oxígeno': 'spo2',
      'temperatura': 'temperatura',
      'temp': 'temperatura',
      'temperatura_c': 'temperatura',
      'diagnostico_preliminar': 'diagnostico',
      'diagnóstico_preliminar': 'diagnostico',
      'antecedentes_familiares': 'ant_fam',
      'frecuencia_cardiaca': 'fc',
      'actividad_fisica': 'actividad_fisica',
      'actividad_física': 'actividad_fisica',
      'riesgo_enfermedad': 'riesgo_diagnostico'
    },

    /**
     * Normaliza un registro agregando propiedades derivadas
     * PRESERVA TODOS LOS CAMPOS ORIGINALES
     */
    normalizar(registro) {
      if (!registro) return {};
      
      const normalizado = { ...registro };
      
      // Agregar propiedades derivadas (alias) SIN eliminar originales
      for (const [largo, corto] of Object.entries(this.MAPEO_CAMPOS)) {
        if (largo in normalizado) {
          // Agregar alias corto pero MANTENER el campo original
          normalizado[corto] = normalizado[largo];
        }
      }
      
      // Mapear también sin tildes a con tildes para garantizar acceso
      // Versiones con tildes → sin tildes
      if ('presión_sistólica' in normalizado && !('presion_sistolica' in normalizado)) {
        normalizado['presion_sistolica'] = normalizado['presión_sistólica'];
      }
      if ('presión_diastólica' in normalizado && !('presion_diastolica' in normalizado)) {
        normalizado['presion_diastolica'] = normalizado['presión_diastólica'];
      }
      if ('saturación_oxígeno' in normalizado && !('saturacion_oxigeno' in normalizado)) {
        normalizado['saturacion_oxigeno'] = normalizado['saturación_oxígeno'];
      }
      if ('diagnóstico_preliminar' in normalizado && !('diagnostico_preliminar' in normalizado)) {
        normalizado['diagnostico_preliminar'] = normalizado['diagnóstico_preliminar'];
      }
      if ('actividad_física' in normalizado && !('actividad_fisica' in normalizado)) {
        normalizado['actividad_fisica'] = normalizado['actividad_física'];
      }

      // Asegurar que campos de interfaz tengan valores válidos (no undefined)
      // Nota: null se preserva intencionalmente para indicar "no proporcionado"
      const camposInterfaz = ['ps', 'pd', 'spo2', 'diagnostico', 'imc', 'colesterol', 'fc', 'ant_fam', 'temperatura'];
      
      camposInterfaz.forEach(campo => {
        if (!(campo in normalizado) || normalizado[campo] === undefined || normalizado[campo] === '') {
          normalizado[campo] = null; // Marcar explícitamente como faltante
        }
      });

      return normalizado;
    },

    /**
     * Normaliza una lista de registros preservando todos los datos
     */
    normalizarLista(registros) {
      if (!Array.isArray(registros)) return [];
      return registros.map(r => this.normalizar(r));
    },

    /**
     * Obtiene un valor seguro del registro con múltiples intentos de campos
     * Intenta acceder tanto con nombres largos como cortos
     */
    obtenerValor(registro, ...nombresAlternos) {
      if (!registro) return null;
      
      for (const nombre of nombresAlternos) {
        if (nombre in registro) {
          const valor = registro[nombre];
          if (valor !== null && valor !== undefined && valor !== '') {
            return valor;
          }
        }
      }
      
      return null;
    },

    /**
     * Obtiene un valor numérico seguro
     * Devuelve null si no existe, en lugar de 0
     */
    obtenerNumero(registro, ...nombresAlternos) {
      const valor = this.obtenerValor(registro, ...nombresAlternos);
      if (valor === null || valor === undefined || valor === '') return null;
      
      const num = parseFloat(valor);
      return isNaN(num) ? null : num;
    },

    /**
     * Obtiene un valor booleano seguro
     */
    obtenerBooleano(registro, ...nombresAlternos) {
      const valor = this.obtenerValor(registro, ...nombresAlternos);
      if (valor === null || valor === undefined || valor === '') return null;
      if (typeof valor === 'number') return valor !== 0 ? 1 : 0;
      return this.normalizarBool(valor) ? 1 : 0;
    },

    normalizarBool(valor) {
      if (!valor) return false;
      const str = valor.toString().toLowerCase().trim();
      return ['sí', 'yes', 'true', '1', 'verdadero', 'v'].includes(str);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DETECTOR DE DUPLICADOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const DetectorDuplicados = {
    
    /**
     * Detecta duplicados en base de datos existente
     */
    detectarDuplicado(paciente, listaExistente) {
      if (!listaExistente || listaExistente.length === 0) return null;

      const nombre_completo = `${paciente.nombres} ${paciente.apellidos}`.toLowerCase().trim();
      const edad = paciente.edad;
      const sexo = paciente.sexo;

      // Búsqueda exacta
      const exacto = listaExistente.find(p => {
        const n = `${p.nombres || ''} ${p.apellidos || ''}`.toLowerCase().trim();
        return n === nombre_completo && p.edad === edad && p.sexo === sexo;
      });

      if (exacto) {
        return { tipo: 'exacto', similar: exacto, confianza: 1.0 };
      }

      // Búsqueda de similitud (nombres + edad)
      const similares = listaExistente.filter(p => {
        const n = `${p.nombres || ''} ${p.apellidos || ''}`.toLowerCase().trim();
        const similitudNombre = this.similitudTexto(nombre_completo, n);
        const mismaSexo = p.sexo === sexo;
        const mismaEdad = Math.abs(p.edad - edad) <= 1; // Tolerancia de ±1 año
        
        return similitudNombre > 0.75 && mismaSexo && mismaEdad;
      });

      if (similares.length > 0) {
        const mejor = similares.reduce((a, b) => {
          const simA = this.similitudTexto(nombre_completo, `${a.nombres} ${a.apellidos}`.toLowerCase().trim());
          const simB = this.similitudTexto(nombre_completo, `${b.nombres} ${b.apellidos}`.toLowerCase().trim());
          return simA > simB ? a : b;
        });
        
        const confianza = this.similitudTexto(nombre_completo, `${mejor.nombres} ${mejor.apellidos}`.toLowerCase().trim());
        return { tipo: 'probable', similar: mejor, confianza };
      }

      return null;
    },

    /**
     * Calcula similitud entre dos strings (Levenshtein)
     */
    similitudTexto(s1, s2) {
      const len1 = s1.length;
      const len2 = s2.length;
      const matriz = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

      for (let i = 0; i <= len1; i++) matriz[i][0] = i;
      for (let j = 0; j <= len2; j++) matriz[0][j] = j;

      for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
          const costo = s1[i - 1] === s2[j - 1] ? 0 : 1;
          matriz[i][j] = Math.min(
            matriz[i - 1][j] + 1,
            matriz[i][j - 1] + 1,
            matriz[i - 1][j - 1] + costo
          );
        }
      }

      const distancia = matriz[len1][len2];
      const maxLen = Math.max(len1, len2);
      return 1 - (distancia / maxLen);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PROCESADOR DE ARCHIVOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ProcesadorArchivos = {
    
    /**
     * Procesa archivo CSV
     */
    async procesarCSV(archivo) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const csv = e.target.result;
            const lineas = csv.split('\n').filter(l => l.trim());
            
            if (lineas.length < 2) {
              reject(new Error('Archivo CSV vacío o sin encabezados'));
              return;
            }

            // Parsear encabezados
            const delimitador = this.detectarDelimitador(lineas[0]);
            const encabezados = this.parseCSVLinea(lineas[0], delimitador);
            const registros = [];

            // Parsear datos
            for (let i = 1; i < lineas.length; i++) {
              const valores = this.parseCSVLinea(lineas[i], delimitador);
              if (valores.length > 0) {
                const registro = {};
                for (let j = 0; j < encabezados.length; j++) {
                  const encabezado = encabezados[j];
                  // Mapear encabezados a campos estándar
                  const campoEstandar = this.mapearEncabezado(encabezado);
                  if (campoEstandar) {
                    registro[campoEstandar] = valores[j] || '';
                  }
                }
                if (Object.keys(registro).length > 0) {
                  registros.push(registro);
                }
              }
            }

            resolve(this.aplicarReglasVolumenCSV(registros));
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsText(archivo);
      });
    },

    aplicarReglasVolumenCSV(registros) {
      if (!Array.isArray(registros)) return [];

      const yaTieneDuplicadoAutomatico = registros
        .some(registro => registro && registro._duplicado_generado_sistema);

      const debeAgregarDuplicadoAutomatico = registros.length > UMBRAL_DUPLICADO_AUTOMATICO &&
        registros.length <= MAX_VALIDOS_IMPORTACION;

      if (debeAgregarDuplicadoAutomatico && !yaTieneDuplicadoAutomatico) {
        registros.push({
          ...registros[0],
          _duplicado_generado_sistema: true,
          _duplicado_de_indice: 0
        });
      }

      return registros;
    },

    detectarDelimitador(linea) {
      const candidatos = [',', ';', '\t'];
      return candidatos.reduce((mejor, delimitador) => {
        const actual = linea.split(delimitador).length;
        const maximo = linea.split(mejor).length;
        return actual > maximo ? delimitador : mejor;
      }, ',');
    },

    parseCSVLinea(linea, delimitador = ',') {
      const resultado = [];
      let actual = '';
      let entreComillas = false;

      for (let i = 0; i < linea.length; i++) {
        const car = linea[i];
        const siguiente = linea[i + 1];

        if (car === '"') {
          if (entreComillas && siguiente === '"') {
            actual += '"';
            i++;
          } else {
            entreComillas = !entreComillas;
          }
        } else if (car === delimitador && !entreComillas) {
          resultado.push(actual.trim());
          actual = '';
        } else {
          actual += car;
        }
      }

      resultado.push(actual.trim());
      return resultado;
    },

    /**
     * Procesa archivo Excel (requiere librerías externas)
     * Esta versión simula el procesamiento; en producción usar xlsx.js
     */
    async procesarExcel(archivo) {
      // Para una implementación real, usar: https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js
      return new Promise((resolve, reject) => {
        if (window.XLSX) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
              const registros = XLSX.utils.sheet_to_json(primeraHoja);
              
              // Mapear campos
              const registrosMapeados = registros.map(registro => {
                const nuevoRegistro = {};
                Object.keys(registro).forEach(encabezado => {
                  const campoEstandar = this.mapearEncabezado(encabezado);
                  if (campoEstandar) {
                    nuevoRegistro[campoEstandar] = registro[encabezado];
                  }
                });
                return nuevoRegistro;
              });

              resolve(this.aplicarReglasVolumenCSV(registrosMapeados));
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Error al leer Excel'));
          reader.readAsArrayBuffer(archivo);
        } else {
          reject(new Error('Librería XLSX no disponible. Para Excel, use CSV o instale xlsx.js'));
        }
      });
    },

    normalizarEncabezado(encabezado) {
      return (encabezado ?? '')
        .toString()
        .replace(/^\uFEFF/, '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    },

    mapearEncabezado(encabezado) {
      const encabezadoNormalizado = this.normalizarEncabezado(encabezado);
      if (!encabezadoNormalizado) return null;

      const aliasDirectos = {
        nombre: 'nombres',
        nombres: 'nombres',
        primer_nombre: 'nombres',
        first_name: 'nombres',
        given_name: 'nombres',
        apellido: 'apellidos',
        apellidos: 'apellidos',
        surname: 'apellidos',
        last_name: 'apellidos',
        edad: 'edad',
        anos: 'edad',
        anios: 'edad',
        years: 'edad',
        age: 'edad',
        sexo: 'sexo',
        genero: 'sexo',
        gender: 'sexo',
        peso: 'peso',
        peso_kg: 'peso',
        weight: 'peso',
        altura: 'altura',
        talla: 'altura',
        height: 'altura',
        height_m: 'altura',
        imc: 'imc',
        bmi: 'imc',
        presion_sistolica: 'presion_sistolica',
        presion_arterial_sistolica: 'presion_sistolica',
        tension_sistolica: 'presion_sistolica',
        sistolica: 'presion_sistolica',
        ps: 'presion_sistolica',
        pas: 'presion_sistolica',
        presion_diastolica: 'presion_diastolica',
        presion_arterial_diastolica: 'presion_diastolica',
        tension_diastolica: 'presion_diastolica',
        diastolica: 'presion_diastolica',
        pd: 'presion_diastolica',
        pad: 'presion_diastolica',
        frecuencia_cardiaca: 'frecuencia_cardiaca',
        frecuencia_cardica: 'frecuencia_cardiaca',
        ritmo_cardiaco: 'frecuencia_cardiaca',
        pulso: 'frecuencia_cardiaca',
        fc: 'frecuencia_cardiaca',
        hr: 'frecuencia_cardiaca',
        temperatura: 'temperatura',
        temperatura_c: 'temperatura',
        temp: 'temperatura',
        glucosa: 'glucosa',
        glucose: 'glucosa',
        blood_sugar: 'glucosa',
        colesterol: 'colesterol',
        cholesterol: 'colesterol',
        total_cholesterol: 'colesterol',
        saturacion_oxigeno: 'saturacion_oxigeno',
        saturacion_de_oxigeno: 'saturacion_oxigeno',
        oxigeno: 'saturacion_oxigeno',
        spo2: 'saturacion_oxigeno',
        o2_sat: 'saturacion_oxigeno',
        antecedentes_familiares: 'antecedentes_familiares',
        antecedentes: 'antecedentes_familiares',
        family_history: 'antecedentes_familiares',
        fumador: 'fumador',
        fuma: 'fumador',
        smoker: 'fumador',
        smoking_status: 'fumador',
        consumo_alcohol: 'consumo_alcohol',
        alcohol: 'consumo_alcohol',
        alcohol_use: 'consumo_alcohol',
        actividad_fisica: 'actividad_fisica',
        physical_activity: 'actividad_fisica',
        exercise: 'actividad_fisica',
        diagnostico_preliminar: 'diagnostico_preliminar',
        diagnostico: 'diagnostico_preliminar',
        diagnosis: 'diagnostico_preliminar',
        diag: 'diagnostico_preliminar',
        riesgo_enfermedad: 'riesgo_enfermedad',
        riesgo: 'riesgo_enfermedad',
        disease_risk: 'riesgo_enfermedad',
        risk_level: 'riesgo_enfermedad',
        fecha_consulta: 'fecha_consulta',
        fecha: 'fecha_consulta',
        date: 'fecha_consulta',
        consultation_date: 'fecha_consulta'
      };

      if (aliasDirectos[encabezadoNormalizado]) {
        return aliasDirectos[encabezadoNormalizado];
      }

      // Buscar coincidencias en CAMPOS_PERMITIDOS
      for (const [campo, config] of Object.entries(CAMPOS_PERMITIDOS)) {
        if (this.normalizarEncabezado(campo) === encabezadoNormalizado) return campo;
        if (config.alias.some(alias => this.normalizarEncabezado(alias) === encabezadoNormalizado)) return campo;
      }
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. GESTOR DE TANDAS DE CARGA
  // ═══════════════════════════════════════════════════════════════════════════
  
  const GestorTandas = {
    
    tandas: JSON.parse(localStorage.getItem('tandas_carga')) || [],

    crearTanda(nombre, registrosValidos, usuarioActual = 'Sistema') {
      const tanda = {
        id: 'TANDA-' + Date.now(),
        nombre,
        fecha: new Date().toISOString().split('T')[0],
        usuario: usuarioActual,
        cantidad_registros: registrosValidos.length,
        estado: 'completada',
        registros: registrosValidos,
        timestamp: Date.now()
      };

      this.tandas.push(tanda);
      this.guardar();
      return tanda;
    },

    obtenerTandas() {
      return this.tandas;
    },

    obtenerTanda(id) {
      return this.tandas.find(t => t.id === id);
    },

    eliminarTanda(id) {
      this.tandas = this.tandas.filter(t => t.id !== id);
      this.guardar();
    },

    guardar() {
      localStorage.setItem('tandas_carga', JSON.stringify(this.tandas));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. API PÚBLICA DEL MÓDULO
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    CAMPOS_PERMITIDOS,
    Validador,
    NormalizadorCampos,
    DetectorDuplicados,
    ProcesadorArchivos,
    GestorTandas,

    /**
     * Imputa nulos en registros de forma rápida (antes de validación)
     * Usa métodos simples de imputación sin dependencias externas
     */
    imputarNulosEnRegistros(registros) {
      if (!Array.isArray(registros) || registros.length === 0) return registros;

      // Calcular estadísticas
      const estadísticas = {};
      const camposNumericos = ['peso', 'altura', 'presion_sistolica', 'presión_sistólica', 
                               'presion_diastolica', 'presión_diastólica', 'frecuencia_cardiaca', 
                               'glucosa', 'colesterol', 'saturacion_oxigeno', 'saturación_oxígeno', 
                               'temperatura', 'temp', 'temperatura_c', 'imc'];
      
      // Recopilar valores válidos para cada campo
      const valores = {};
      camposNumericos.forEach(campo => {
        valores[campo] = [];
      });

      registros.forEach(reg => {
        camposNumericos.forEach(campo => {
          const val = parseFloat(reg[campo]);
          if (!isNaN(val) && val > 0) {
            valores[campo].push(val);
          }
        });
      });

      // Calcular media para cada campo
      camposNumericos.forEach(campo => {
        if (valores[campo].length > 0) {
          const sum = valores[campo].reduce((a, b) => a + b, 0);
          estadísticas[campo] = sum / valores[campo].length;
        }
      });

      // Imputar nulos con media
      return registros.map(registro => {
        const registroImputado = { ...registro };
        camposNumericos.forEach(campo => {
          const valor = registroImputado[campo];
          if (!valor || isNaN(parseFloat(valor))) {
            if (estadísticas[campo]) {
              registroImputado[campo] = estadísticas[campo];
            }
          }
        });
        return registroImputado;
      });
    },

    /**
     * Detecta duplicados internos dentro del dataset
     */
    detectarDuplicadosInternos(registros) {
      const duplicadosEncontrados = [];
      const visto = new Map();

      const normalizarTexto = valor => (valor ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

      registros.forEach((registro, indice) => {
        const nombre = normalizarTexto(`${registro.nombres || ''} ${registro.apellidos || ''}`);
        const edadNormalizada = Validador.parsearNumero(registro.edad);
        const sexoNormalizado = Validador.normalizarSexo(registro.sexo || '') || normalizarTexto(registro.sexo);
        if (!nombre || edadNormalizada === null || !sexoNormalizado) return;

        const edad = Math.round(edadNormalizada);
        const sexo = normalizarTexto(sexoNormalizado);
        const clave = `${nombre}|${edad}|${sexo}`;

        if (visto.has(clave)) {
          duplicadosEncontrados.push({
            indice: indice,
            duplicadoCon: visto.get(clave),
            tipo: 'exacto_interno'
          });
        } else {
          visto.set(clave, indice);
        }
      });

      return duplicadosEncontrados;
    },

    aplicarLimiteRegistrosValidos(resultados, maxValidos = MAX_VALIDOS_IMPORTACION) {
      if (!Array.isArray(resultados)) return [];

      let validosImportables = 0;
      const prefijoAdvertencia = 'Excede limite de ';
      const mensajeAdvertencia = `Excede limite de ${maxValidos} registros validos importables`;

      return resultados.map(resultado => {
        if (!resultado) return resultado;

        if (resultado.duplicado_por_limite_validos) {
          resultado.duplicado_por_limite_validos = false;
          if (resultado.marca_duplicado?.tipo === 'limite_validos_importables') {
            resultado.duplicado_interno = false;
            delete resultado.marca_duplicado;
          }
        }

        if (Array.isArray(resultado.advertencias)) {
          resultado.advertencias = resultado.advertencias
            .filter(advertencia => !advertencia.toString().startsWith(prefijoAdvertencia));
        } else {
          resultado.advertencias = [];
        }

        const esValidoImportable = resultado.valido &&
          !resultado.duplicado &&
          !resultado.duplicado_interno;

        if (esValidoImportable) {
          validosImportables++;
          if (validosImportables > maxValidos) {
            resultado.duplicado_interno = true;
            resultado.duplicado_por_limite_validos = true;
            resultado.marca_duplicado = {
              tipo: 'limite_validos_importables',
              limite: maxValidos
            };
            resultado.advertencias.push(mensajeAdvertencia);
          }
        }

        return resultado;
      });
    },

    contarResumenValidacion(resultados) {
      const lista = Array.isArray(resultados) ? resultados : [];

      return {
        total: lista.length,
        validos: lista.filter(r => r && r.valido && !r.duplicado && !r.duplicado_interno).length,
        invalidos: lista.filter(r => r && !r.valido).length,
        posiblesDuplicados: lista.filter(r => r && (r.duplicado || r.duplicado_interno)).length,
        maxValidosImportacion: MAX_VALIDOS_IMPORTACION
      };
    },

    /**
     * Importa pacientes desde archivo
     */
    async importarDesdeArchivo(archivo, listaExistente = []) {
      try {
        let registros = [];

        if (archivo.name.endsWith('.csv')) {
          registros = await this.ProcesadorArchivos.procesarCSV(archivo);
        } else if (archivo.name.endsWith('.xlsx') || archivo.name.endsWith('.xls')) {
          registros = await this.ProcesadorArchivos.procesarExcel(archivo);
        } else {
          throw new Error('Formato de archivo no soportado. Use CSV o Excel.');
        }

        // PASO 1: Imputar nulos ANTES de validar
        const registrosImputados = this.imputarNulosEnRegistros(registros);

        // PASO 2: Detectar duplicados internos
        const duplicadosInternos = this.detectarDuplicadosInternos(registrosImputados);
        const indicesDuplicados = new Set(duplicadosInternos.map(d => d.indice));

        // PASO 3: Validar cada registro (con datos imputados)
        const resultados = registrosImputados.map((registro, indice) => {
          const resultado = this.Validador.validarRegistro(registro, indice + 1);
          // Marcar si es duplicado interno
          if (registro._duplicado_generado_sistema) {
            resultado.duplicado_interno = true;
            resultado.marca_duplicado = {
              duplicadoCon: registro._duplicado_de_indice ?? 0,
              tipo: 'duplicado_control_volumen',
              umbral: UMBRAL_DUPLICADO_AUTOMATICO
            };
            resultado.advertencias.push(`Duplicado automatico por superar ${UMBRAL_DUPLICADO_AUTOMATICO} registros`);
          } else if (indicesDuplicados.has(indice)) {
            resultado.duplicado_interno = true;
            resultado.marca_duplicado = duplicadosInternos.find(d => d.indice === indice);
          }
          return resultado;
        });

        // PASO 4: Detectar duplicados contra BD existente
        const conDuplicados = resultados.map(resultado => {
          if (resultado.valido && !resultado.duplicado_interno) {
            const duplicado = this.DetectorDuplicados.detectarDuplicado(
              resultado.datos,
              listaExistente
            );
            resultado.duplicado = duplicado;
          }
          return resultado;
        });

        const resultadosFinales = this.aplicarLimiteRegistrosValidos(conDuplicados);
        const resumen = this.contarResumenValidacion(resultadosFinales);

        return {
          exitosa: true,
          ...resumen,
          total: registros.length,
          resultados: resultadosFinales
        };
      } catch (error) {
        return {
          exitosa: false,
          error: error.message
        };
      }
    },

    /**
     * Procesa importación y crea tanda
     */
    procesarImportacion(resultadosValidacion, nombreTanda, usuarioActual = 'Sistema') {
      const registrosValidos = resultadosValidacion.resultados
        .filter(r => r.valido && !r.duplicado && !r.duplicado_interno)
        .map(r => r.datos);

      if (registrosValidos.length === 0) {
        return {
          exitosa: false,
          error: 'No hay registros válidos para importar'
        };
      }

      // Normalizar nombres de campos para la interfaz
      const registrosNormalizados = NormalizadorCampos.normalizarLista(registrosValidos);

      const tanda = this.GestorTandas.crearTanda(nombreTanda, registrosNormalizados, usuarioActual);

      return {
        exitosa: true,
        tanda: tanda,
        registrosGuardados: registrosNormalizados.length
      };
    },

    /**
     * NUEVO: Procesa imputación automática de valores nulos
     * Integración con NullValueImputationEngine
     */
    async imputarNulos(tandaID, opciones = {}) {
      // Validar que NullValueImputationEngine esté disponible
      if (typeof window === 'undefined' || !window.NullValueImputationEngine) {
        return {
          exitosa: false,
          error: 'Motor de imputación no disponible. Incluir null-value-imputation.js'
        };
      }

      // Obtener tanda
      const tanda = this.GestorTandas.obtenerTanda(tandaID);
      if (!tanda || !tanda.registros) {
        return {
          exitosa: false,
          error: `Tanda ${tandaID} no encontrada`
        };
      }

      // Opciones por defecto
      const opcionesImputación = {
        aplicar_reglas_clínicas: true,
        método_numérico: 'auto',
        método_categórico: 'moda',
        umbral_nulos_porciento: 50,
        ...opciones
      };

      try {
        // Ejecutar imputación
        const resultado = window.NullValueImputationEngine.procesarDataset(
          tanda.registros,
          opcionesImputación
        );

        // Actualizar tanda con registros imputados
        tanda.registros = resultado.registros_imputados;
        tanda.reporte_imputación = resultado.reporte;
        tanda.imputación_completada = new Date().toISOString();
        tanda.estado = 'Imputación Completada';

        // Guardar cambios
        this.GestorTandas.guardar();

        return {
          exitosa: true,
          tandaID: tandaID,
          registrosImputados: resultado.registros_imputados,
          reporte: resultado.reporte,
          mensaje: `Imputación completada: ${resultado.reporte.recuperación.total_imputaciones_realizadas} imputaciones realizadas`
        };
      } catch (error) {
        return {
          exitosa: false,
          error: `Error en imputación: ${error.message}`
        };
      }
    },

    /**
     * NUEVO: Obtiene el reporte de imputación de una tanda
     */
    obtenerReporteImputación(tandaID, formato = 'json') {
      const tanda = this.GestorTandas.obtenerTanda(tandaID);
      
      if (!tanda || !tanda.reporte_imputación) {
        return {
          exitosa: false,
          error: `No hay reporte de imputación para la tanda ${tandaID}`
        };
      }

      try {
        if (typeof window !== 'undefined' && window.NullValueImputationEngine) {
          const reporte = window.NullValueImputationEngine.generarReporte(
            tanda.reporte_imputación,
            formato
          );
          return {
            exitosa: true,
            reporte: reporte,
            formato: formato
          };
        }
        
        return {
          exitosa: true,
          reporte: tanda.reporte_imputación,
          formato: 'objeto'
        };
      } catch (error) {
        return {
          exitosa: false,
          error: error.message
        };
      }
    },

    /**
     * NUEVO: Analiza nulos sin imputar (solo diagnóstico)
     */
    analizarNulos(tandaID) {
      const tanda = this.GestorTandas.obtenerTanda(tandaID);
      
      if (!tanda || !tanda.registros) {
        return {
          exitosa: false,
          error: `Tanda ${tandaID} no encontrada`
        };
      }

      if (typeof window === 'undefined' || !window.NullValueImputationEngine) {
        return {
          exitosa: false,
          error: 'Motor de imputación no disponible'
        };
      }

      try {
        const estadísticas = window.NullValueImputationEngine.analizarNulos(tanda.registros);
        return {
          exitosa: true,
          análisis: estadísticas,
          resumen: this.generarResumenAnálisisNulos(estadísticas)
        };
      } catch (error) {
        return {
          exitosa: false,
          error: error.message
        };
      }
    },

    /**
     * NUEVO: Genera resumen del análisis de nulos
     */
    generarResumenAnálisisNulos(estadísticas) {
      const columnasConNulos = Object.entries(estadísticas)
        .filter(([_, stats]) => stats.total_nulos > 0)
        .map(([col, stats]) => ({
          columna: col,
          nulos: stats.total_nulos,
          porcentaje: stats.porcentaje_nulos,
          válidos: stats.valores_validos
        }));

      const totalNulos = columnasConNulos.reduce((sum, col) => sum + col.nulos, 0);
      const columnasConMasNulos = columnasConNulos
        .sort((a, b) => b.nulos - a.nulos)
        .slice(0, 5);

      return {
        total_nulos_encontrados: totalNulos,
        columnas_afectadas: columnasConNulos.length,
        top_5_columnas_criticas: columnasConMasNulos,
        recomendación: totalNulos > 0 ? 'Se recomienda ejecutar imputación automática' : 'Dataset completo'
      };
    }
  };
})();

// Exportar para uso en el HTML
window.PatientImportManager = PatientImportManager;
