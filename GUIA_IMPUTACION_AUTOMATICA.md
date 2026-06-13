# SISTEMA DE IMPUTACIÓN AUTOMÁTICA DE VALORES NULOS
## Guía de Implementación y Uso

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Estado:** ✅ PRODUCTIVO  

---

## 📋 DESCRIPCIÓN GENERAL

Sistema profesional de tratamiento automático de valores nulos integrado al ETL clínico con:
- ✅ Detección automática de valores faltantes
- ✅ Imputación estadística (media, mediana, moda)
- ✅ Reglas clínicas inteligentes
- ✅ Reportes detallados con trazabilidad
- ✅ Integración no destructiva con sistema existente

---

## 📁 ARCHIVOS CREADOS

### 1. **null-value-imputation.js** (1000+ líneas)
Motor de imputación profesional con:
- Detector de valores nulos
- Calculador estadístico (media, mediana, moda)
- Motor de reglas clínicas
- Motor de imputación
- Generador de reportes

**Módulos Principales:**
```javascript
NullValueImputationEngine = {
  DetectorNulos,           // Identifica nulos
  CalculadorEstadistico,   // Media, mediana, moda
  MotorReglasClínicas,     // Reglas clínicas
  MotorImputación,         // Ejecuta imputación
  GeneradorReportes        // Genera reportes
}
```

### 2. **null-value-imputation-ui.js** (500+ líneas)
Interfaz gráfica para visualización de reportes:
- Visualizador de reportes en modal
- Descargador en múltiples formatos (JSON, CSV, HTML)
- Sistema de notificaciones
- Integración con PatientImportManager

### 3. Integración en **patient-import-manager.js**
Tres nuevos métodos agregados:
```javascript
PatientImportManager.imputarNulos(tandaID, opciones)
PatientImportManager.obtenerReporteImputación(tandaID, formato)
PatientImportManager.analizarNulos(tandaID)
```

### 4. Actualización en **index.html**
- Inclusión de scripts de imputación
- Botones en UI: "Analizar Nulos" y "Imputar Automáticamente"
- Funciones JavaScript: `mostrarAnálisisNulos()` y `ejecutarImputaciónAutomática()`

---

## 🔧 REGLAS CLÍNICAS IMPLEMENTADAS

### 1. **Cálculo de IMC**
Si falta el IMC pero existen peso y altura:
```
IMC = peso / (altura²)
Confianza: ALTA
```

### 2. **Estimación de Presión Arterial**
Si faltan PS o PD, se usa media histórica del dataset:
```
PS_media = promedio(presion_sistolica válida)
PD_media = promedio(presion_diastolica válida)
Confianza: MEDIA
```

### 3. **Saturación de Oxígeno por Edad**
```
RN/Neonato (<1 año)     → 92%
Lactante (1-5 años)     → 93%
Adultos (>5 años)       → 95%
Confianza: MEDIA
```

### 4. **Frecuencia Cardíaca por Edad**
```
< 1 año     → 120 bpm
1-3 años    → 110 bpm
3-6 años    → 105 bpm
6-12 años   → 95 bpm
12-18 años  → 85 bpm
> 18 años   → 75 bpm
Confianza: ALTA
```

### 5. **Glucosa Basal**
Si falta glucosa, se asume valor estándar en ayunas:
```
Glucosa = 100 mg/dL
Confianza: BAJA (valor conservador)
```

---

## 📊 MÉTODOS ESTADÍSTICOS

### Para Columnas Numéricas:

| Columna | Método Default | Rango Válido | Unidad |
|---------|---|---|---|
| peso | Media | 2-300 | kg |
| altura | Media | 0.5-2.5 | m |
| imc | Media | 10-60 | kg/m² |
| presion_sistolica | Mediana | 50-250 | mmHg |
| presion_diastolica | Mediana | 30-150 | mmHg |
| frecuencia_cardiaca | Mediana | 40-200 | bpm |
| glucosa | Mediana | 40-600 | mg/dL |
| colesterol | Mediana | 50-500 | mg/dL |
| saturacion_oxigeno | Mediana | 0-100 | % |
| temperatura | Mediana | 35-42 | °C |

### Para Columnas Categóricas:
Se utiliza **MODA** (valor más frecuente):
- sexo
- antecedentes_familiares
- actividad_fisica
- diagnostico_preliminar
- riesgo_enfermedad

### Para Columnas Booleanas:
Se utiliza **MODA BOOLEANA**:
- fumador
- consumo_alcohol

---

## 🚀 CÓMO USAR

### Paso 1: Importar Datos
```
1. Click en "Importar CSV/Excel"
2. Seleccionar archivo
3. Validar y completar importación
```

### Paso 2: Analizar Nulos (Opcional)
```
1. Seleccionar tanda en dropdown
2. Click en "Analizar Nulos"
3. Ver resumen de valores faltantes
```

### Paso 3: Ejecutar Imputación
```
1. Seleccionar tanda
2. Click en "Imputar Automáticamente"
3. Confirmar operación
4. Esperar procesamiento
5. Ver reporte en modal
```

### Paso 4: Descargar Reporte
```
En el modal del reporte:
- Click "Descargar JSON"  → Descarga formato JSON completo
- Click "Descargar CSV"   → Descarga formato CSV tabulado
```

---

## 📈 REPORTE DE IMPUTACIÓN

El reporte incluye:

### Sección 1: Nulos Detectados
```
┌─────────────────┬───────┬────────────┬──────────┐
│ Columna         │ Nulos │ Porcentaje │ Válidos  │
├─────────────────┼───────┼────────────┼──────────┤
│ altura          │ 2     │ 20.0%      │ 8        │
│ temperatura     │ 1     │ 10.0%      │ 9        │
└─────────────────┴───────┴────────────┴──────────┘
```

### Sección 2: Métodos Aplicados
```
┌─────────────────┬──────────────────┬──────────┬────────┐
│ Columna         │ Método           │ Imputados│ Valor  │
├─────────────────┼──────────────────┼──────────┼────────┤
│ altura          │ media            │ 2        │ 1.72   │
│ temperatura     │ mediana          │ 1        │ 36.8   │
│ imc             │ regla_clínica_IMC│ 3        │ 28.2   │
└─────────────────┴──────────────────┴──────────┴────────┘
```

### Sección 3: Recuperación de Datos
- **Reglas Clínicas:** Registros recuperados usando lógica médica
- **Imputación Estadística:** Registros completados con media/mediana/moda
- **Total Imputaciones:** Suma de todos los valores rellenados

### Sección 4: Métricas de Calidad
- **Completitud Final:** % de celdas completas después de imputación
- **Mejora en Completitud:** Cambio porcentual en calidad de datos
- **Registros sin Cambios:** Registros que ya estaban completos

---

## 💾 DATOS GUARDADOS

Los registros imputados se guardan automáticamente en:
1. **LocalStorage** - tanda.registros (con datos imputados)
2. **Historial** - Cada registro tiene `_historial_imputación`
3. **Reporte** - tanda.reporte_imputación

### Estructura del Historial por Registro
```javascript
registro._historial_imputación = [
  {
    columna: "altura",
    método: "media",
    valor_imputado: 1.72,
    confianza: "Media",
    basado_en: "8 valores válidos"
  },
  {
    columna: "imc",
    método: "regla_clínica_IMC",
    fórmula: "peso / (altura²)",
    valor_imputado: 28.2,
    confianza: "Alta"
  }
]
```

---

## 🛡️ SEGURIDAD Y VALIDACIONES

### Umbral de Nulos
Por defecto, NO se imputa una columna si tiene > 50% de nulos vacíos.
```javascript
opciones.umbral_nulos_porciento = 50 // ajustable
```

### Rango de Validación
Cada columna tiene rango mín/máx biológicamente válido:
- **Peso:** 2-300 kg
- **Altura:** 0.5-2.5 m
- **SpO₂:** 0-100%
- **Temperatura:** 35-42°C

### Coherencia Clínica
Se valida que los valores imputados sean clínicamente coherentes.

---

## 🔌 API PÚBLICA

### NullValueImputationEngine
```javascript
// Procesar dataset completo
NullValueImputationEngine.procesarDataset(registros, opciones)

// Generar reporte
NullValueImputationEngine.generarReporte(reporte, formato)

// Analizar nulos sin imputar
NullValueImputationEngine.analizarNulos(registros)

// Obtener estadísticas de columna
NullValueImputationEngine.obtenerEstadísticasColumna(registros, nombreColumna)
```

### PatientImportManager (Nuevos Métodos)
```javascript
// Ejecutar imputación automática
PatientImportManager.imputarNulos(tandaID, opciones)

// Obtener reporte guardado
PatientImportManager.obtenerReporteImputación(tandaID, formato)

// Analizar nulos sin imputar
PatientImportManager.analizarNulos(tandaID)
```

### NullValueImputationUI
```javascript
// Ejecutar imputación con interfaz
NullValueImputationUI.ejecutarImputaciónCompleta(tandaID)

// Mostrar análisis rápido
NullValueImputationUI.mostrarAnálisisRápido(tandaID)

// Visualizar reporte
NullValueImputationUI.Visualizador.mostrarReporteEnModal(reporte, tandaID)
```

---

## ⚙️ OPCIONES DE CONFIGURACIÓN

```javascript
const opciones = {
  aplicar_reglas_clínicas: true,      // Usar lógica médica
  método_numérico: 'auto',            // 'media', 'mediana', 'auto'
  método_categórico: 'moda',          // Siempre 'moda'
  umbral_nulos_porciento: 50,         // Max % nulos para imputar
  verbose: true                        // Logs en consola
};

resultado = PatientImportManager.imputarNulos(tandaID, opciones);
```

---

## 📋 EJEMPLO DE FLUJO COMPLETO

```javascript
// 1. Importar datos
const resultado = await PatientImportManager.importarDesdeArchivo(archivo);

// 2. Procesar
const importación = PatientImportManager.procesarImportacion(
  resultado.resultados,
  'Mi Tanda de Pacientes'
);
const tandaID = importación.tanda.id;

// 3. Analizar nulos (opcional)
const análisis = PatientImportManager.analizarNulos(tandaID);
console.log('Total nulos:', análisis.resumen.total_nulos_encontrados);

// 4. Imputar
const imputación = await PatientImportManager.imputarNulos(tandaID);
console.log(imputación.mensaje); 
// → "Imputación completada: 15 imputaciones realizadas"

// 5. Ver reporte
const reporte = PatientImportManager.obtenerReporteImputación(tandaID, 'json');
console.log(reporte.reporte);

// 6. Registros ya están imputados en tanda.registros
const tanda = PatientImportManager.GestorTandas.obtenerTanda(tandaID);
console.log(tanda.registros); // ← Con valores completos
```

---

## 🔍 DIAGNÓSTICO Y TROUBLESHOOTING

### Problema: "Motor de imputación no disponible"
**Solución:** Verificar que `null-value-imputation.js` esté incluido en index.html

### Problema: Nada sucede al hacer click en "Imputar"
**Solución:** 
1. Verificar que haya una tanda seleccionada
2. Ver console.log para errores
3. Validar que los módulos estén cargados: `window.NullValueImputationEngine`

### Problema: Valores imputados parecen incorrectos
**Solución:** 
1. Verificar en el historial: `registro._historial_imputación`
2. Revisar el reporte para ver qué método se aplicó
3. Ajustar opciones de imputación si es necesario

### Ver Logs de Depuración
```javascript
// En consola del navegador
console.log(window.NullValueImputationEngine);
console.log(window.PatientImportManager);
console.log(window.NullValueImputationUI);
```

---

## 📊 EJEMPLOS DE SALIDA

### JSON Report
```json
{
  "fecha_procesamiento": "08/06/2026 14:35:22",
  "total_registros_procesados": 10,
  "resumen_nulos": {
    "total_columnas": 23,
    "columnas_con_nulos": [
      {
        "columna": "altura",
        "nulos_encontrados": 2,
        "porcentaje": 20.0,
        "valores_válidos": 8
      }
    ]
  },
  "recuperación": {
    "registros_recuperados_por_reglas_clínicas": 3,
    "registros_recuperados_por_imputación_estadística": 12,
    "total_imputaciones_realizadas": 15
  },
  "métricas_calidad": {
    "porcentaje_completitud_final": "98.5",
    "mejora_completitud": "+12.3",
    "registros_sin_cambios": 7
  }
}
```

---

## ✅ VALIDACIÓN SIN ROMPER LO EXISTENTE

✅ **No modifica:**
- Funcionalidad de importación existente
- Sistema de validación clínica
- Detección de duplicados
- Gestión de tandas
- UI de pacientes
- Gráficos y analytics

✅ **Agrega:**
- Nuevo motor de imputación (aislado)
- Nuevos botones en UI
- Nuevos métodos en PatientImportManager
- Nuevas funciones en index.html

✅ **Preserva:**
- Datos originales en localStorage
- Historial de cambios por registro
- Compatibilidad con navegadores antiguos
- Performance del sistema

---

## 🎓 REFERENCIA BIBLIOGRÁFICA

Métodos implementados basados en:
- **Little & Rubin (2002):** Statistical Analysis with Missing Data
- **Rubin (1987):** Multiple Imputation for Nonresponse in Surveys
- **White et al. (2011):** Multiple imputation using chained equations
- **ACC/AHA Guidelines 2017:** Parámetros clínicos normales
- **WHO Classification:** Umbrales de normalidad globales

---

## 📞 SOPORTE

Para reportar bugs o sugerencias:
1. Verificar logs en consola (F12)
2. Revisar el reporte de imputación
3. Consultar este documento
4. Contactar al equipo de desarrollo

---

**Versión 1.0 - Junio 2026**
Sistema de Imputación Automática - ETL Clínico Profesional
