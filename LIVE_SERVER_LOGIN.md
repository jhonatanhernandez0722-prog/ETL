# Guía de Login en Live Server

## Resumen

En el entorno de **Live Server** (sin backend Node.js), el login funciona **localmente en JavaScript** usando las credenciales almacenadas en `index.html`.

---

## Credenciales de Prueba

Usa cualquiera de estos usuarios para ingresar:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `medico` | `medico123` | Médico |
| `analista` | `analista123` | Analista |

También puedes usar el email completo:
- `admin@ips.local`
- `medico@ips.local`
- `analista@ips.local`

---

## Cómo Usar Live Server

### Opción 1: Desde VS Code (Recomendado)

1. Haz clic derecho en `index.html`
2. Selecciona **"Open with Live Server"**
3. Se abrirá automáticamente en `http://localhost:5500` (o similar)
4. Deberías ver la pantalla de login

### Opción 2: Línea de comandos

```bash
cd c:\Users\USUARIO\Desktop\Images\cancion\Nueva carpeta\Nueva carpeta\Health-analythics
npx live-server
```

---

## Debugging en Live Server

Si el login no funciona, abre la **Consola del Navegador** (F12):

1. Presiona **F12** para abrir Developer Tools
2. Ve a la pestaña **Console**
3. Busca mensajes como:
   - `"Inicializando autenticación..."`
   - `"Formulario de login enviado"`
   - `"Login exitoso"`

Si ves errores, comparte los mensajes de la consola.

---

## Características

### Login Local (Sin Backend)

✓ Funciona completamente en el navegador  
✓ No necesita servidor Node.js  
✓ Sesión guardada en `localStorage`  
✓ Sesión persiste al refrescar la página  
✓ Control de roles y permisos integrado  

### Roles y Permisos

**Administrador**: Acceso total a todos los módulos  
**Médico**: Acceso a dashboard, pacientes, análisis y reportes  
**Analista**: Acceso a dashboard, pacientes, ETL, ML y reportes  

---

## Notas Importantes

### Para Testing Backend (Node.js)

Si necesitas probar con backend y base de datos PostgreSQL:

```bash
npm install
npm start
```

Entonces accede a `http://localhost:3000`

### Local Storage

La sesión se guarda en el navegador en `localStorage` con la clave:
```
healthanalytics_auth_user
```

Para limpiar la sesión desde la consola:
```javascript
localStorage.removeItem('healthanalytics_auth_user');
location.reload();
```

---

## Solución de Problemas

### El login no aparece

**Causa**: El JavaScript no se está ejecutando
**Solución**: 
1. Abre la Consola (F12)
2. Revisa si hay errores de JavaScript
3. Recarga la página (Ctrl + Shift + R)

### El formulario no responde

**Causa**: El listener no se configuró correctamente
**Solución**:
1. Abre la Consola (F12)
2. Busca el mensaje `"Listener de formulario configurado"`
3. Si no aparece, busca mensajes de error
4. Intenta refrescar (Ctrl + Shift + R)

### Sesión no persiste

**Causa**: localStorage está bloqueado o no disponible
**Solución**:
1. Comprueba que no estés en modo privado/incógnito
2. Verifica permisos de almacenamiento del navegador
3. Limpia cache y cookies

---

## Desarrollo Local

Para trabajar en desarrollo:

1. **Usar Live Server** para el frontend (HTML/CSS/JS)
2. **Usar Node.js + Express** solo cuando necesites probar APIs

### Estructura

```
Health-analythics/
├── index.html                  ← Login y UI (funciona con Live Server)
├── server.js                   ← Backend opcional (Node.js + Express)
├── .env.local                  ← Variables de entorno para backend
├── public/                      ← Archivos estáticos
└── package.json                ← Dependencias de Node.js
```

---

## Más Ayuda

- Documenta problemas en la **Consola del navegador** (F12)
- Verifica que los archivos estén en la ubicación correcta
- Asegúrate de que Live Server está sirviendo desde la carpeta correcta
