/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SISTEMA MÉDICO INTELIGENTE - MÓDULO CORE CLÍNICO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Arquitectura profesional con:
 * - Lógica médica contextual por edad
 * - Validaciones clínicas robustas
 * - Análisis inteligente combinado
 * - Terminología médica profesional
 * - Cero inconsistencias médicas
 * 
 * Versión: 2.0 Senior Architecture
 * Especialidad: Medicina Interna, Pediatría, Geriatría
 * 
 * Basado en:
 * - ACC/AHA Guidelines 2017
 * - ADA Standards 2024
 * - ATP III Guidelines
 * - WHO Classifications
 * - Pediatric Standards (AHA)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// 1. CLASIFICADOR DE GRUPOS ETARIOS
// ═══════════════════════════════════════════════════════════════════════════

const AgeGroupClassifier = {
  /**
   * Clasifica paciente en grupo etario con características médicas
   * @param {number} edad - Edad en años
   * @returns {Object} Grupo etario con parámetros médicos
   */
  classify(edad) {
    if (edad < 0.25) return this.LACTANTE_MENOR;
    if (edad < 3) return this.LACTANTE;
    if (edad < 13) return this.PEDIATRICO;
    if (edad < 18) return this.ADOLESCENTE;
    if (edad < 65) return this.ADULTO;
    return this.GERIATRICO;
  },

  LACTANTE_MENOR: {
    grupo: 'Lactante Menor',
    codigo: 'LAC-M',
    rango_edad: '0-3 meses',
    caracteristicas: ['Signos vitales muy variables', 'FC muy elevada', 'PA muy baja'],
    multiplicador_riesgo: 0.7,
    requiere_pediatra: true,
    evaluacion_especial: true
  },

  LACTANTE: {
    grupo: 'Lactante',
    codigo: 'LAC',
    rango_edad: '3 meses - 2 años',
    caracteristicas: ['Signos vitales en rango amplio', 'Desarrollo crítico', 'Mayor variabilidad'],
    multiplicador_riesgo: 0.8,
    requiere_pediatra: true,
    evaluacion_especial: true
  },

  PEDIATRICO: {
    grupo: 'Niño',
    codigo: 'PED',
    rango_edad: '3 - 12 años',
    caracteristicas: ['Signos vitales relativamente estables', 'Desarrollo normal', 'Raramente patología CV'],
    multiplicador_riesgo: 0.85,
    requiere_pediatra: true,
    evaluacion_especial: true
  },

  ADOLESCENTE: {
    grupo: 'Adolescente',
    codigo: 'ADO',
    rango_edad: '13 - 17 años',
    caracteristicas: ['Transición a signos adultos', 'Evaluación diferente', 'Considerar madurez'],
    multiplicador_riesgo: 0.9,
    requiere_pediatra: false,
    evaluacion_especial: true
  },

  ADULTO: {
    grupo: 'Adulto',
    codigo: 'ADU',
    rango_edad: '18 - 64 años',
    caracteristicas: ['Rangos estándar', 'Evaluación médica convencional', 'Mayor carga de enfermedad'],
    multiplicador_riesgo: 1.0,
    requiere_pediatra: false,
    evaluacion_especial: false
  },

  GERIATRICO: {
    grupo: 'Adulto Mayor',
    codigo: 'GER',
    rango_edad: '65+ años',
    caracteristicas: ['Mayor variabilidad en rangos', 'Múltiples comorbilidades esperadas', 'Evaluación cuidadosa'],
    multiplicador_riesgo: 1.3,
    requiere_pediatra: false,
    evaluacion_especial: true
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. RANGOS NORMALES CLÍNICOS POR EDAD (Basados en directrices médicas)
// ═══════════════════════════════════════════════════════════════════════════

const MedicalNormRanges = {
  
  /**
   * PRESIÓN ARTERIAL - Rangos según directrices ACC/AHA y pediátricas
   */
  bloodPressure: {
    lactante_menor: {
      systolic: [50, 70],
      diastolic: [30, 45],
      descripcion: 'Muy variable, requiere monitoreo pediátrico especializado'
    },
    lactante: {
      systolic: [80, 100],
      diastolic: [50, 65],
      descripcion: 'Rangos para 6 meses a 3 años'
    },
    pediatrico_3_5: {
      systolic: [95, 110],
      diastolic: [60, 75],
      descripcion: '3 a 5 años'
    },
    pediatrico_6_9: {
      systolic: [105, 120],
      diastolic: [70, 80],
      descripcion: '6 a 9 años'
    },
    pediatrico_10_12: {
      systolic: [110, 130],
      diastolic: [75, 85],
      descripcion: '10 a 12 años'
    },
    adolescente: {
      systolic: [120, 135],
      diastolic: [80, 85],
      descripcion: '13 a 17 años, convergiendo a rango adulto'
    },
    adulto_normal: {
      systolic: [<120, <80],
      diastolic: [<80, null],
      descripcion: 'Normal (ACC/AHA 2017)'
    },
    adulto_elevada: {
      systolic: [120, 129],
      diastolic: [<80, null],
      descripcion: 'Presión elevada'
    },
    adulto_hta1: {
      systolic: [130, 139],
      diastolic: [80, 89],
      descripcion: 'Hipertensión Estadio 1'
    },
    adulto_hta2: {
      systolic: [>=140, null],
      diastolic: [>=90, null],
      descripcion: 'Hipertensión Estadio 2'
    },
    geriatrico_normal: {
      systolic: [<130, null],
      diastolic: [<80, null],
      descripcion: 'Objetivo en adulto mayor',
      nota: 'Considerar comorbilidades'
    }
  },

  /**
   * FRECUENCIA CARDÍACA - Rangos según edad
   * Basado en recomendaciones de la American Heart Association
   */
  heartRate: {
    lactante_menor: {
      min: 120,
      max: 160,
      descripcion: 'Lactantes 0-3 meses muy variables'
    },
    lactante_1_2: {
      min: 100,
      max: 150,
      descripcion: '4 meses a 2 años'
    },
    pediatrico_3_5: {
      min: 95,
      max: 140,
      descripcion: '3 a 5 años'
    },
    pediatrico_6_9: {
      min: 80,
      max: 120,
      descripcion: '6 a 9 años'
    },
    pediatrico_10_12: {
      min: 70,
      max: 110,
      descripcion: '10 a 12 años'
    },
    adolescente_adulto: {
      min: 60,
      max: 100,
      descripcion: '13+ años (convergencia a adulto)'
    },
    geriatrico: {
      min: 60,
      max: 100,
      descripcion: 'Adulto mayor, similar a adulto joven'
    }
  },

  /**
   * GLUCOSA - Rangos normales según edad
   * Basado en ADA Standards 2024
   */
  glucose: {
    pediatrico_ayunas: {
      min: 70,
      max: 100,
      descripcion: 'Niños en ayunas (3-12 años)'
    },
    adolescente_ayunas: {
      min: 70,
      max: 100,
      descripcion: 'Adolescentes en ayunas'
    },
    adulto_ayunas: {
      min: 70,
      max: 100,
      descripcion: 'Normal en ayunas'
    },
    adulto_prediabetes: {
      min: 100,
      max: 125,
      descripcion: 'Alteración de glucosa en ayunas (prediabetes)'
    },
    adulto_diabetes: {
      min: 126,
      max: Infinity,
      descripcion: 'Diabetes (≥126 mg/dL en ayunas)'
    },
    geriatrico_ayunas: {
      min: 80,
      max: 130,
      descripcion: 'Adulto mayor: rango más permisivo',
      nota: 'Considerar riesgo hipoglucemia'
    },
    postprandial_normal: {
      min: 0,
      max: 140,
      descripcion: '2 horas post-comida, normal'
    }
  },

  /**
   * COLESTEROL - Categorías según edad y riesgo
   * Basado en ATP III Guidelines
   */
  cholesterol: {
    pediatrico: {
      deseable: 170,
      borderline: [170, 199],
      alto: '≥200',
      descripcion: 'Niños y adolescentes'
    },
    adulto: {
      deseable: 200,
      borderline: [200, 239],
      alto: '≥240',
      descripcion: 'Adultos'
    },
    ldl_target: {
      bajo_riesgo: '<160',
      riesgo_moderado: '<130',
      alto_riesgo: '<100',
      muy_alto_riesgo: '<70',
      descripcion: 'LDL (colesterol malo) objetivos'
    }
  },

  /**
   * SATURACIÓN DE OXÍGENO (SpO₂)
   * Crítica en todas las edades pero con consideraciones especiales
   */
  oxygenSaturation: {
    todos_normal: {
      min: 95,
      max: 100,
      descripcion: 'Normal en todas las edades'
    },
    todos_baja: {
      min: 90,
      max: 94,
      descripcion: 'Hipoxemia leve - requiere evaluación'
    },
    todos_severa: {
      min: 85,
      max: 89,
      descripcion: 'Hipoxemia moderada - requiere intervención'
    },
    todos_critica: {
      min: 0,
      max: 84,
      descripcion: 'Hipoxemia severa - EMERGENCIA'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. VALIDADOR CLÍNICO - Coherencia y Lógica Médica
// ═══════════════════════════════════════════════════════════════════════════

const ClinicalValidator = {
  
  /**
   * Valida coherencia completa de datos vitales
   * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
   */
  validatePatientData(datos) {
    const resultado = { valid: true, errors: [], warnings: [] };

    // Validación 1: Edad válida
    if (!datos.edad || datos.edad < 0 || datos.edad > 150) {
      resultado.errors.push('Edad inválida');
      resultado.valid = false;
    }

    // Validación 2: Presión arterial coherente
    if (datos.ps && datos.pd) {
      if (datos.ps < datos.pd) {
        resultado.errors.push('Presión sistólica debe ser ≥ diastólica');
        resultado.valid = false;
      }
      if (datos.ps > 250 || datos.pd > 150) {
        resultado.warnings.push('Valores de PA extremadamente elevados - verificar equipo');
      }
      if (datos.ps < 50 || datos.pd < 30) {
        resultado.warnings.push('Valores de PA extremadamente bajos - hipotensión severa');
      }
    }

    // Validación 3: Glucosa válida
    if (datos.glucosa) {
      if (datos.glucosa < 20) {
        resultado.errors.push('Glucosa extremadamente baja (<20) - hipoglucemia severa');
        resultado.valid = false;
      }
      if (datos.glucosa > 600) {
        resultado.warnings.push('Glucosa extremadamente alta (>600) - riesgo cetoacidosis');
      }
    }

    // Validación 4: FC válida por edad
    const ageGroup = AgeGroupClassifier.classify(datos.edad);
    if (datos.fc) {
      const ranges = this.getExpectedFCRange(datos.edad);
      if (datos.fc < ranges.min * 0.5 || datos.fc > ranges.max * 1.5) {
        resultado.warnings.push(`FC fuera de rango esperado para ${ageGroup.grupo}`);
      }
    }

    // Validación 5: IMC válido
    if (datos.peso && datos.altura) {
      const imc = datos.peso / (datos.altura * datos.altura);
      if (imc < 10 || imc > 60) {
        resultado.warnings.push('IMC fuera de rangos biológicamente posibles');
      }
    }

    // Validación 6: SpO₂ válida
    if (datos.spo2 && (datos.spo2 < 0 || datos.spo2 > 100)) {
      resultado.errors.push('SpO₂ debe estar entre 0-100%');
      resultado.valid = false;
    }

    return resultado;
  },

  /**
   * Obtiene rango esperado de FC para edad
   */
  getExpectedFCRange(edad) {
    const ranges = MedicalNormRanges.heartRate;
    if (edad < 0.25) return { min: ranges.lactante_menor.min, max: ranges.lactante_menor.max };
    if (edad < 3) return { min: ranges.lactante_1_2.min, max: ranges.lactante_1_2.max };
    if (edad < 6) return { min: ranges.pediatrico_3_5.min, max: ranges.pediatrico_3_5.max };
    if (edad < 10) return { min: ranges.pediatrico_6_9.min, max: ranges.pediatrico_6_9.max };
    if (edad < 13) return { min: ranges.pediatrico_10_12.min, max: ranges.pediatrico_10_12.max };
    if (edad < 65) return { min: ranges.adolescente_adulto.min, max: ranges.adolescente_adulto.max };
    return { min: ranges.geriatrico.min, max: ranges.geriatrico.max };
  },

  /**
   * Valida coherencia de diagnóstico médico
   * NO debe contradicción entre parámetros
   */
  validateMedicalCoherence(evaluaciones) {
    const warnings = [];

    // Coherencia 1: Si PA normal, no debe haber crisis hipertensiva
    if (evaluaciones.bp && evaluaciones.bp.riskLevel === 0 && 
        evaluaciones.bp.classification === 'Crisis Hipertensiva') {
      warnings.push('INCONSISTENCIA: PA normal pero clasificada como crisis');
    }

    // Coherencia 2: Si SpO₂ crítica, debe haber alerta respiratoria
    if (evaluaciones.spo2 && evaluaciones.spo2.value < 85 && 
        !evaluaciones.spo2.alert) {
      warnings.push('INCONSISTENCIA: SpO₂ crítica pero sin alerta');
    }

    // Coherencia 3: Glucosa extrema debe generar alerta
    if (evaluaciones.glucose && evaluaciones.glucose.value > 300 && 
        evaluaciones.glucose.riskLevel < 5) {
      warnings.push('INCONSISTENCIA: Glucosa muy alta pero riesgo bajo');
    }

    return warnings;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. GESTOR DE TERMINOLOGÍA PROFESIONAL
// ═══════════════════════════════════════════════════════════════════════════

const TerminologyManager = {
  
  /**
   * Convierte términos informales a profesionales
   */
  getProfessionalTerm(termino_informal, contexto = 'general') {
    const mapping = {
      'presión alta': 'Elevación de PA',
      'presión baja': 'Hipotensión',
      'glucosa alta': 'Hiperglucemia / Alteración glucémica',
      'glucosa baja': 'Hipoglucemia',
      'colesterol alto': 'Dislipidemia / Hipercolesterolemia',
      'corazón rápido': 'Taquicardia',
      'corazón lento': 'Bradicardia',
      'respiración rápida': 'Taquipnea',
      'saturación baja': 'Hipoxemia',
      'peso alto': 'Incremento ponderal / Sobrepeso-Obesidad',
      'tiene diabetes': 'Hallazgos compatibles con diabetes mellitus',
      'tiene hipertension': 'Hallazgos compatibles con hipertensión arterial',
      'normal': 'Dentro de rangos esperados',
      'malo': 'Alterado / Elevado',
      'bueno': 'Óptimo / Normal'
    };

    return mapping[termino_informal.toLowerCase()] || termino_informal;
  },

  /**
   * Genera redacción profesional de hallazgos
   */
  generateProfessionalFinding(parametro, valor, categoria) {
    const findings = {
      hipertension_i: `Hallazgos compatibles con hipertensión arterial estadio I. Se recomienda monitoreo y cambios en el estilo de vida.`,
      hipertension_ii: `Hallazgos compatibles con hipertensión arterial estadio II. Se recomienda evaluación médica e inicio de farmacoterapia.`,
      crisis_hipertensiva: `Crisis hipertensiva. Requiere evaluación médica INMEDIATA en urgencias.`,
      hipoxemia_leve: `Hipoxemia leve. Se recomienda evaluar causa (pulmonar vs. cardíaca vs. metabólica).`,
      hipoxemia_moderada: `Hipoxemia moderada. Requiere evaluación médica urgente y consideración de oxigenoterapia.`,
      hipoxemia_severa: `Hipoxemia severa. EMERGENCIA. Requiere oxigenoterapia inmediata y evaluación en urgencias.`,
      hiperglucemia: `Alteración glucémica. Se recomienda confirmación con HbA1c y evaluación endocrinológica.`,
      dislipidemia: `Alteración del perfil lipídico. Se recomienda perfil lipídico completo (LDL, HDL, triglicéridos).`
    };

    return findings[categoria] || 'Requiere evaluación médica.';
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Exportar módulos para uso en HTML
// ═══════════════════════════════════════════════════════════════════════════

// (Estos serán inyectados en el HTML mediante <script>)
window.MedicalCore = {
  AgeGroupClassifier,
  MedicalNormRanges,
  ClinicalValidator,
  TerminologyManager
};
