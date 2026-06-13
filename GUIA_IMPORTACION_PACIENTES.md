# Módulo de Gestión de Pacientes - Importación Masiva

## Descripción General

Se ha modificado el módulo **"Gestión de Pacientes"** del sistema HealthAnalytics IPS para convertirlo en el punto principal de carga de registros clínicos. El módulo ahora soporta:

1. **Registro manual de pacientes** (funcionalidad existente mejorada)
2. **Importación masiva desde CSV y Excel**
3. **Validación clínica automática**
4. **Detección de duplicados**
5. **Gestión de Tandas de Carga**

---

## Nuevas Funcionalidades

### 1. Importación Masiva (CSV/Excel)

#### Botón "Importar CSV/Excel"
- Ubicado en la barra de herramientas de "Gestión de Pacientes"
- Abre un modal de importación en 2 pasos

#### Paso 1: Selección del Archivo
- Seleccione un archivo CSV o Excel (.csv, .xlsx, .xls)
- El sistema reconoce automáticamente los campos del archivo
- Tamaño máximo soportado: 10MB

#### Paso 2: Revisión de Validación
Después de procesar el archivo, verá:
- **Cantidad de registros válidos**: Listos para importar
- **Cantidad de registros inválidos**: Con errores de validación
- **Posibles duplicados**: Detectados automáticamente
- **Tabla de detalle**: Con estado y errores de cada registro

### 2. Campos Soportados en la Importación

#### Obligatorios
- `nombres` (alias: nombre, first_name, given_name)
- `apellidos` (alias: surname, last_name, apellido)
- `edad` (alias: age, años, years)
- `sexo` (alias: gender, género)

#### Recomendados
- `peso` (alias: weight, peso_kg) [en kg]
- `altura` (alias: height, height_m, talla) [en metros]
- `presion_sistolica` (alias: ps, systolic, presion_sys) [mmHg]
- `presion_diastolica` (alias: pd, diastolic, presion_dia) [mmHg]
- `glucosa` (alias: glucose, blood_sugar) [mg/dL]
- `colesterol` (alias: cholesterol, total_cholesterol) [mg/dL]
- `saturacion_oxigeno` (alias: spo2, oxygen_saturation, o2_sat) [%]

#### Opcionales
- `temperatura` (alias: temp, temperatura_c) [°C]
- `frecuencia_cardiaca` (alias: fc, heart_rate, hr, pulso) [lpm]
- `antecedentes_familiares` (alias: antecedentes, family_history)
- `fumador` (alias: smoker, smoking_status, fuma) [Sí/No, 1/0, True/False]
- `consumo_alcohol` (alias: alcohol, alcohol_use) [Sí/No, 1/0, True/False]
- `actividad_fisica` (alias: physical_activity, exercise)
- `diagnostico_preliminar` (alias: diagnosis, diag, diagnóstico)
- `riesgo_enfermedad` (alias: disease_risk, risk_level, riesgo)
- `fecha_consulta` (alias: consultation_date, fecha, date)

---

## Validaciones Automáticas

El sistema aplica validaciones clínicas en cada registro:

### Validaciones Obligatorias
✓ Nombres y apellidos no vacíos
✓ Edad entre 0 y 150 años
✓ Sexo válido (Masculino/Femenino)

### Validaciones de Coherencia
✓ Presión sistólica ≥ presión diastólica
✓ Valores de presión entre rangos biológicos válidos
✓ SpO₂ entre 0-100%
✓ Glucosa entre 20-600 mg/dL
✓ Peso entre 0-300 kg
✓ Altura entre 0.5-2.5 metros

### Cálculo Automático de IMC
- Si peso y altura están presentes: IMC se calcula automáticamente
- Si IMC se proporciona: se valida contra el calculado
- Tolerancia de ±0.5 en la comparación

### Advertencias (No-Bloqueantes)
⚠ Valores fuera de rangos esperados por edad
⚠ Presión arterial extrema
⚠ Glucosa muy alta o muy baja
⚠ Temperatura anormal
⚠ Inconsistencias en IMC

---

## Detección de Duplicados

El sistema utiliza un algoritmo de similitud texto (Levenshtein) para detectar duplicados:

### Búsqueda Exacta
- Coincide nombre completo + edad + sexo exactamente
- **Confianza: 100%**

### Búsqueda Probable
- Similitud de nombre > 75%
- Edad con tolerancia ±1 año
- Mismo sexo
- **Confianza: Variable** (75-99%)

Los registros duplicados se marcan como advertencia pero PUEDEN importarse si lo desea.

---

## Tandas de Carga

Cada importación masiva crea una **Tanda de Carga** que registra:

### Información de la Tanda
- **ID Único**: TANDA-[Timestamp]
- **Nombre**: Definido por el usuario en el momento de importación
- **Fecha de Creación**: Automática (YYYY-MM-DD)
- **Usuario**: Usuario que realizó la importación
- **Cantidad de Registros**: Total de pacientes en la tanda
- **Estado**: Completada / En proceso / Con errores

### Sección "Tandas de Carga Registradas"
Ubicada en la parte inferior de "Gestión de Pacientes", permite:

**Ver Tanda**
- Muestra detalles de la tanda
- Lista los primeros 5 pacientes
- Información de auditoría

**Eliminar Tanda**
- Elimina el registro histórico de la tanda
- Los pacientes se mantienen en el sistema
- Operación irreversible (pide confirmación)

**Refrescar**
- Actualiza la tabla de tandas desde el almacenamiento local

---

## Flujo de Importación Paso a Paso

### 1. Preparar el archivo
```
Crear CSV o Excel con campos requeridos
Validar que todos tengan nombres, apellidos, edad, sexo
Incluir campos clínicos relevantes
```

### 2. Abrir Gestión de Pacientes
```
Menú → "Gestión de Pacientes"
Botón "Importar CSV/Excel"
```

### 3. Seleccionar archivo
```
Click en área de carga
Elegir archivo de su computadora
Validar formato de archivo
```

### 4. Revisar validación
```
El sistema procesa el archivo
Muestra resumen: válidos, inválidos, duplicados
Revisa detalles en la tabla
```

### 5. Importar registros
```
Define nombre para la tanda (ej: "Importación Enero 2024")
Click en "Importar Registros Válidos"
Sistema crea tanda y agrega pacientes
```

### 6. Verificar en Tandas de Carga
```
Scroll a sección "Tandas de Carga Registradas"
Verifica nueva tanda
Puede ver detalles o eliminar si necesario
```

---

## Archivo de Ejemplo

Se incluye **`ejemplo_importacion_pacientes.csv`** con:
- 10 pacientes de ejemplo
- Todos los campos recomendados
- Diversos rangos de edad y condiciones
- Casos con antecedentes y factores de riesgo

### Cómo usar el ejemplo:
1. Abra "Gestión de Pacientes"
2. Click en "Importar CSV/Excel"
3. Seleccione `ejemplo_importacion_pacientes.csv`
4. Valide y revise los registros
5. Importe con nombre "Pacientes Ejemplo"

---

## Especificaciones Técnicas

### Módulo JavaScript: `patient-import-manager.js`

**Componentes principales:**

#### PatientImportManager.Validador
- Valida cada registro contra reglas clínicas
- Detecta campos obligatorios
- Valida rangos de valores
- Calcula IMC automáticamente

#### PatientImportManager.DetectorDuplicados
- Similitud de texto (Levenshtein)
- Búsqueda exacta
- Búsqueda probabilística
- Confianza en rango 0-1

#### PatientImportManager.ProcesadorArchivos
- Parsea CSV manualmente (sin librerías)
- Soporta Excel con librería XLSX (opcional)
- Mapea encabezados automáticamente
- Maneja caracteres especiales

#### PatientImportManager.GestorTandas
- CRUD de tandas
- Almacenamiento en localStorage
- Persistencia entre sesiones
- JSON serializado

### Almacenamiento Local
- **LocalStorage Key**: `tandas_carga`
- **Formato**: JSON array de tandas
- **Capacidad**: Hasta 5-10MB según navegador
- **Persistencia**: Entre sesiones navegador

---

## Limitaciones y Consideraciones

### Limitaciones Conocidas
- Máximo 10MB por archivo CSV/Excel
- Máximo 1000 registros por importación (recomendado)
- No soporta importación de fotografías
- Excel requiere librería XLSX cargada

### Recomendaciones
- Validar datos antes de importar
- Usar nombres de columnas consistentes
- Incluir encabezados en CSV
- Probar con archivo pequeño primero
- Usar formato CSV para máxima compatibilidad

### Recuperación de Errores
- Registros inválidos se marcan pero no se importan
- Puede intentar nuevamente con archivo corregido
- Duplicados detectados pero pueden forzarse
- Historial de tandas está disponible

---

## Seguridad y Privacidad

### Datos Personales
- Se almacenan en localStorage del navegador
- No se envía a servidores remotos
- Encriptación: No (considere usar HTTPS)
- Borrado: Manual (eliminar tanda o datos navegador)

### Validación de Datos
- Validación de tipos en cliente
- Limpieza de strings (trim)
- Conversión de tipos automática
- Sin acceso a directorio de sistema

---

## Troubleshooting

### "Archivo no válido"
→ Verifique extensión (.csv, .xlsx, .xls)
→ Confirme que el archivo no está corrupto

### "No hay campos reconocidos"
→ Revise encabezados del CSV
→ Use alias de campos si es necesario
→ Consulte lista de campos soportados

### "Todos los registros son inválidos"
→ Verifique campos obligatorios: nombres, apellidos, edad, sexo
→ Revise tipos de datos (edad debe ser número)
→ Use archivo de ejemplo como referencia

### "Datos no aparecen después de importar"
→ Verifique sección "Tandas de Carga"
→ Refresque página (F5)
→ Revise localStorage del navegador

---

## Próximas Mejoras Planificadas

🔄 Importación de fotografías de pacientes
📊 Exportación de tandas en Excel
🔐 Encriptación de datos en localStorage
☁️ Sincronización con servidor
📋 Template downloader para CSV
🔍 Búsqueda avanzada en tandas
📈 Estadísticas de importación

---

## Contacto y Soporte

Para problemas o sugerencias:
1. Verifique las instrucciones de troubleshooting
2. Revise el archivo de ejemplo
3. Consulte la documentación del sistema
4. Reporte en el área de soporte

---

**Versión**: 1.0
**Última actualización**: Junio 2024
**Módulo**: Gestión de Pacientes - Import Manager
