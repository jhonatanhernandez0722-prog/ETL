# PLAN DE REFACTORIZACIÓN PROFESIONAL
## HealthAnalytics IPS - Transformación a Plataforma Clínica Inteligente

**Versión**: 1.0 Senior Architecture  
**Fecha**: Mayo 2025  
**Objetivo**: Transformar a software médico hospitalario profesional

---

## ANÁLISIS ACTUAL DEL SISTEMA

### FORTALEZAS ✓
- Estructura HTML con navegación funcional
- Evaluación de parámetros vitales básicos
- Sistema de scoring ponderado
- Recomendaciones generadas dinámicamente
- Interfaz visual atractiva

### PROBLEMAS CRÍTICOS ✗
- **SIN lógica médica por edad** → Usa rangos universales
- **NO hay diferenciaciación pediátrica** → Trata niños como adultos
- **Variables undefined** → Faltan validaciones
- **Arquitectura monolítica** → Todo en un archivo HTML
- **SIN análisis contextual** → Solo suma parámetros
- **Inconsistencias médicas** → Contradicciones en diagnósticos
- **SIN validaciones clínicas** → No verifica coherencia
- **Terminología mixta** → Informal y formal mezclados

---

## ARQUITECTURA PROFESIONAL PROPUESTA

### 1. MÓDULOS PRINCIPALES

```
SISTEMA MÉDICO INTELIGENTE
├── CORE CLÍNICO
│   ├── ageGroupClassifier    → Determina grupo etario
│   ├── medicalNormRanges     → Rangos por edad
│   ├── vitalSignsAnalyzer    → Evaluación por parámetro
│   ├── combinedAnalysis      → Análisis de combinaciones
│   └── clinicalValidator     → Validaciones coherentes
│
├── EVALUADORES POR EDAD
│   ├── PediatricEvaluator    → 0-12 años
│   ├── AdolescentEvaluator   → 13-17 años
│   ├── AdultEvaluator        → 18-64 años
│   └── GeriatricEvaluator    → 65+ años
│
├── ALERTAS Y SEVERIDAD
│   ├── AlertManager          → Gestión de alertas
│   ├── SeverityClassifier    → Verde/Amarillo/Naranja/Rojo
│   └── ClinicalWarnings      → Alertas específicas
│
├── ANÁLISIS AVANZADO
│   ├── RiskScorer            → Scoring contextual
│   ├── AnomalyDetector       → Detección de anomalías
│   ├── InteractionAnalyzer   → Interacciones clínicas
│   └── ContextualAnalysis    → Análisis por contexto
│
└── UTILIDADES
    ├── ClinicalValidator     → Validaciones médicas
    ├── TerminologyManager    → Lenguaje profesional
    └── DataFormatter         → Formatos consistentes
```

### 2. RANGOS NORMALES POR EDAD

**PRESIÓN ARTERIAL**
```javascript
{
  pediatric: {0-2: "95-105/60-70", 3-5: "100-110/65-75", 6-12: "105-120/70-80"},
  adolescent: {13-17: "110-135/65-85"},
  adult: {18-64: "120-130/80-85"},
  geriatric: {65+: "130-140/80-90"}
}
```

**FRECUENCIA CARDÍACA**
```javascript
{
  pediatric: {0-1: "120-160", 2-5: "95-140", 6-12: "70-110"},
  adolescent: {13-17: "60-100"},
  adult: {18-64: "60-100"},
  geriatric: {65+: "60-100"}
}
```

**GLUCOSA**
```javascript
{
  pediatric: {0-12: "70-100 ayunas"},
  adolescent: {13-17: "70-100 ayunas"},
  adult: {18-64: "70-100 ayunas"},
  geriatric: {65+: "100-125 ayunas (aceptable)"}
}
```

**COLESTEROL**
```javascript
{
  pediatric: {0-12: "<170 total"},
  adolescent: {13-17: "<170 total"},
  adult: {18-64: "<200 total"},
  geriatric: {65+: "<200 total"}
}
```

### 3. LÓGICA DE CLASIFICACIÓN DE EDAD

```javascript
function classifyAgeGroup(edad) {
  if (edad < 3) return { group: 'lactante', code: 'LAC', risk_adjustment: 1.0 };
  if (edad < 13) return { group: 'pediatric', code: 'PED', risk_adjustment: 0.8 };
  if (edad < 18) return { group: 'adolescent', code: 'ADO', risk_adjustment: 0.9 };
  if (edad < 65) return { group: 'adult', code: 'ADU', risk_adjustment: 1.0 };
  return { group: 'geriatric', code: 'GER', risk_adjustment: 1.3 };
}
```

### 4. ANÁLISIS COMBINADO INTELIGENTE

**Combinaciones de riesgo:**
```javascript
{
  "hipoxemia_taquicardia": {
    message: "Posible compromiso respiratorio",
    severity: "orange",
    action: "Considerar evaluación pulmonar urgente"
  },
  "glucosa_alta_antecedentes": {
    message: "Riesgo metabólico aumentado",
    severity: "orange",
    action: "Correlacionar clínicamente, considerar HbA1c"
  },
  "hipertension_colesterol_fumador": {
    message: "Riesgo cardiovascular muy elevado",
    severity: "red",
    action: "Evaluación cardíaca inmediata"
  }
}
```

---

## IMPLEMENTACIÓN PASO A PASO

### FASE 1: REFACTORIZACIÓN CORE (Hoy)
- [ ] Crear módulo `AgeGroupClassifier`
- [ ] Crear módulo `MedicalNormRanges` por edad
- [ ] Crear módulo `ClinicalValidator`
- [ ] Refactorizar `evaluateBloodPressure` con lógica por edad
- [ ] Refactorizar `evaluateHeartRate` con lógica por edad
- [ ] Refactorizar `evaluateGlucose` con lógica por edad
- [ ] Eliminar variables undefined
- [ ] Implementar validaciones básicas

### FASE 2: ANÁLISIS AVANZADO
- [ ] Crear `CombinedAnalysisEngine`
- [ ] Implementar detección de anomalías
- [ ] Crear scoring contextual por edad
- [ ] Implementar alertas profesionales
- [ ] Crear `AnomalyDetector` inteligente

### FASE 3: UI/UX PROFESIONAL
- [ ] Dashboard clínico moderno
- [ ] Tarjetas médicas por parámetro
- [ ] Gráficos evolutivos
- [ ] Alertas visuales por severidad
- [ ] Modo pediátrico visual

### FASE 4: VALIDACIONES Y COHERENCIA
- [ ] Sistema de validación clínica
- [ ] Eliminación de contradicciones
- [ ] Verificación de coherencia
- [ ] Manejo robusto de errores

---

## ELIMINACIÓN DE INCONSISTENCIAS

### PROBLEMA 1: Rangos universales
**Actual:** FC 90 lpm = taquicardia en adulto
**Correcto:** FC 90 lpm = normal en pediatría, taquicardia en adulto

**Solución:** Método `isVitalSignAbnormal(valor, parametro, edad)`

### PROBLEMA 2: Variables undefined
**Actual:** Mostrar "Riesgo metabólico: undefined"
**Correcto:** Validar y usar valor por defecto o mensaje profesional

**Solución:** Validación pre-evaluación `validateVitalSignData(param)`

### PROBLEMA 3: Diagnósticos absolutos
**Actual:** "El paciente tiene diabetes"
**Correcto:** "Hallazgos compatibles con alteración glucémica"

**Solución:** Terminología profesional en `TerminologyManager`

### PROBLEMA 4: Recomendaciones inadecuadas para edad
**Actual:** Sugerir fármacos a niños de 5 años
**Correcto:** Uso de terminología pediátrica y referencia a pediatra

**Solución:** Evaluador contextual por edad

---

## TERMINOLOGÍA PROFESIONAL

### CONVERSIÓN REQUERIDA

| Actual | Profesional |
|--------|-------------|
| "El paciente tiene..." | "Hallazgos compatibles con..." |
| "Alto" | "Elevado" o "Riesgo estratificado" |
| "Malo" | "Alteración del perfil lipídico" |
| "Normal" | "Dentro de rangos esperados para edad" |
| "Diabetes" | "Alteración glucémica / Hiperglucemia" |
| "Presión alta" | "Elevación de PA / Hipertensión" |
| "Saturación baja" | "Hipoxemia" |
| "Corazón rápido" | "Taquicardia" |

---

## VALIDACIONES CLÍNICAS

### Validación 1: Coherencia de PA
```javascript
if (ps < 60 || pd < 40) alert("Hipotensión severa - requiere validación");
if (ps >= 180 || pd >= 120) alert("Crisis hipertensiva - emergencia");
```

### Validación 2: Coherencia de FC
```javascript
const normal = ageGroup === 'pediatric' ? [70, 110] : [60, 100];
if (fc > normal[1]) alert("Taquicardia: verif icaciones necesarias");
```

### Validación 3: Coherencia glucémica
```javascript
if (glucosa < 50) alert("Hipoglucemia severa - emergencia");
if (glucosa > 400) alert("Hiperglucemia severa - riesgo metabólico crítico");
```

---

## ANÁLISIS COMBINADO

### Ejemplo: Paciente 70 años con múltiples factores
```
Input:
- Edad: 70
- PA: 155/95
- Glucosa: 165
- Colesterol: 260
- FC: 98
- SpO2: 94%
- Fumador: Sí

Análisis ACTUAL (sin contexto):
"Riesgo Alto" ← Genérico

Análisis PROFESIONAL (contextual):
- Edad: 70 años → Riesgo basal elevado (multiplicador 1.3)
- PA 155/95 → HTA II (muy elevada para adulto mayor)
- Glucosa 165 → Alteración glucémica significativa
- Combinación HTA + Glucosa + Colesterol + Edad + Fumador
  → SÍNDROME METABÓLICO + RIESGO CV MUY ELEVADO
- Recomendación: "Riesgo cardiovascular crítico. Requiere evaluación médica inmediata. Correlacionar clínicamente con ECG de reposo."
```

---

## MÉTRICAS DE ÉXITO

- ✓ Cero variables undefined
- ✓ Cero contradicciones médicas
- ✓ 100% coherencia clínica
- ✓ Lógica diferenciada por edad
- ✓ Terminología profesional 100%
- ✓ Alertas contextuales por severidad
- ✓ Sin diagnósticos absolutos
- ✓ Arquitectura modular y escalable

---

## PRÓXIMOS PASOS

1. **Implementar Core Médico** - Clasificador de edad + rangos
2. **Refactorizar Evaluadores** - Lógica por edad
3. **Crear Validador Clínico** - Coherencia
4. **Implementar Análisis Combinados** - Inteligencia contextual
5. **Mejorar UI/UX** - Interfaz profesional
6. **Testing** - Casos clínicos reales
7. **Documentación** - API médica completa

**RESULTADO FINAL**: Plataforma médica inteligente de nivel empresarial.
