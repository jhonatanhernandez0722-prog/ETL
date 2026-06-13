const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();

// ============================================================================
// CONFIGURACIÓN DE CONEXIÓN A NEON POSTGRESQL
// ============================================================================

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
let pool = null;

function getDatabaseInfo() {
  if (!process.env.DATABASE_URL) {
    return { host: 'no configurada', database: 'no configurada' };
  }

  try {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || 'desconocida'
    };
  } catch (error) {
    return { host: 'url invalida', database: 'desconocida' };
  }
}

if (!hasDatabaseUrl) {
  console.error('ERROR: DATABASE_URL no está configurada en las variables de entorno');
  console.error('Configura DATABASE_URL en .env.local o en Vercel > Environment Variables');
} else {
  const databaseInfo = getDatabaseInfo();
  console.log('INFO: Conectando a Neon PostgreSQL...');
  console.log('Base de datos:', databaseInfo.database);

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  pool.on('error', (err) => {
    console.error('ERROR del pool de conexiones inesperado:', err);
  });

  pool.on('connect', () => {
    console.log('Conexión al pool establecida');
  });
}

function requireDatabase() {
  if (!pool) {
    const error = new Error('DATABASE_URL no está configurada');
    error.statusCode = 503;
    throw error;
  }
  return pool;
}

function queryDb(...args) {
  return requireDatabase().query(...args);
}

function sendDatabaseError(res, error, context) {
  console.error(`${context}:`, error.message);
  res.status(error.statusCode || 500).json({
    error: error.statusCode === 503 ? 'Base de datos no configurada' : error.message
  });
}

function passwordMatches(storedPassword, providedPassword) {
  const stored = Buffer.from(String(storedPassword || ''));
  const provided = Buffer.from(String(providedPassword || ''));
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}

function getInitials(name, email) {
  const source = String(name || email || '').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || 'US';
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// SERVIR ARCHIVOS ESTÁTICOS E INTERFAZ WEB
// ============================================================================

// Servir archivos estáticos (CSS, JS, imágenes, etc.) con rutas absolutas
const staticDir = path.join(__dirname, '.');
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));
app.use(express.static(staticDir));

// Ruta raíz: servir index.html (SPA)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback para rutas no encontradas en archivos estáticos
app.use((req, res, next) => {
  // No redirigir archivos con extensiones (js, css, png, etc.)
  if (req.path.match(/\.\w+$/)) {
    return res.status(404).send('Not Found');
  }
  // Si no es una ruta API y no tiene extensión, servir index.html (SPA)
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    next();
  }
});

// ============================================================================
// RUTAS DE PRUEBA Y VERIFICACIÓN
// ============================================================================

// Ruta de salud para verificar conexión a BD
app.get('/api/health', async (req, res) => {
  try {
    const result = await queryDb('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      message: 'Conexión a BD exitosa',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('ERROR en /api/health:', error.message);
    res.status(error.statusCode || 500).json({
      status: 'error', 
      message: error.statusCode === 503 ? 'Base de datos no configurada' : 'Fallo en conexión a BD',
      details: error.message
    });
  }
});

// Ruta de verificación de variables de entorno
app.get('/api/debug/env', async (req, res) => {
  const databaseInfo = getDatabaseInfo();
  res.json({
    hasDatabase: hasDatabaseUrl,
    databaseHost: databaseInfo.host,
    databaseName: databaseInfo.database,
    port: process.env.PORT || '3000',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// RUTAS DE PACIENTES
// ============================================================================

// GET - Buscar pacientes
app.get('/api/pacientes/buscar', async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
  }
  
  try {
    const result = await queryDb(
      `SELECT id, nombres, apellidos, edad, sexo, imc, peso, altura, estado, fecha_registro
       FROM pacientes 
       WHERE nombres ILIKE $1 
          OR apellidos ILIKE $1
          OR id ILIKE $1
       ORDER BY apellidos, nombres
       LIMIT 50`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener todos los pacientes
app.get('/api/pacientes', async (req, res) => {
  try {
    const result = await queryDb(
      `SELECT id, nombres, apellidos, edad, sexo, imc, estado
       FROM pacientes
       ORDER BY apellidos, nombres
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener un paciente específico
app.get('/api/pacientes/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await queryDb(
      `SELECT * FROM pacientes WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo paciente:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Crear nuevo paciente
app.post('/api/pacientes', async (req, res) => {
  const { id, nombres, apellidos, edad, sexo, peso, altura, imc } = req.body;
  
  try {
    const result = await queryDb(
      `INSERT INTO pacientes (id, nombres, apellidos, edad, sexo, peso, altura, imc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, nombres, apellidos, edad, sexo, peso, altura, imc]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando paciente:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE CONSULTAS
// ============================================================================

// GET - Obtener consultas de un paciente
app.get('/api/consultas/:pacienteId', async (req, res) => {
  const { pacienteId } = req.params;
  
  try {
    const result = await queryDb(
      `SELECT c.*, u.nombre as medico_nombre
       FROM consultas c
       LEFT JOIN usuarios u ON c.usuario_medico_id = u.id
       WHERE c.paciente_id = $1
       ORDER BY c.fecha_consulta DESC
       LIMIT 20`,
      [pacienteId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo consultas:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Crear nueva consulta
app.post('/api/consultas', async (req, res) => {
  const { 
    paciente_id, 
    presion_sistolica, 
    presion_diastolica, 
    glucosa, 
    temperatura,
    frecuencia_cardiaca,
    saturacion_oxigeno,
    colesterol,
    riesgo_nivel, 
    usuario_medico_id,
    diagnostico_preliminar,
    notas
  } = req.body;
  
  try {
    const result = await queryDb(
      `INSERT INTO consultas 
       (paciente_id, fecha_consulta, presion_sistolica, presion_diastolica, glucosa, temperatura, frecuencia_cardiaca, saturacion_oxigeno, colesterol, riesgo_nivel, usuario_medico_id, diagnostico_preliminar, notas)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [paciente_id, presion_sistolica, presion_diastolica, glucosa, temperatura, frecuencia_cardiaca, saturacion_oxigeno, colesterol, riesgo_nivel, usuario_medico_id, diagnostico_preliminar, notas]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando consulta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE USUARIOS
// ============================================================================

// GET - Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await queryDb(
      `SELECT u.id, u.email, u.nombre, r.nombre as rol, u.estado, u.fecha_creacion
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       ORDER BY u.nombre`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Validar login (verificar credenciales)
app.post('/api/usuarios/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password requeridos' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  
  try {
    const result = await queryDb(
      `SELECT u.id, u.email, u.nombre, u.password_hash, r.nombre as rol, u.estado
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE LOWER(u.email) = $1`,
      [normalizedEmail]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Usuario inactivo' });
    }
    
    if (!passwordMatches(user.password_hash, password)) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    // Actualizar último acceso
    await queryDb(
      `UPDATE usuarios SET fecha_ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.nombre,
      role: user.rol,
      initials: getInitials(user.nombre, user.email)
    });
  } catch (error) {
    sendDatabaseError(res, error, 'Error en login');
  }
});

// ============================================================================
// RUTAS DE REPORTES Y ESTADÍSTICAS
// ============================================================================

// GET - Estadísticas de pacientes
app.get('/api/reportes/estadisticas', async (req, res) => {
  try {
    const result = await queryDb(
      `SELECT 
         COUNT(*) as total_pacientes,
         COUNT(CASE WHEN estado = 'activo' THEN 1 END) as pacientes_activos
       FROM pacientes`
    );
    
    const riesgos = await queryDb(
      `SELECT riesgo_nivel, COUNT(*) as cantidad
       FROM consultas
       WHERE fecha_consulta >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY riesgo_nivel
       ORDER BY cantidad DESC`
    );
    
    res.json({
      pacientes: result.rows[0],
      riesgos_ultimos_30_dias: riesgos.rows
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INICIO DEL SERVIDOR
// ============================================================================

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`URL de salud: http://localhost:${PORT}/api/health`);
    console.log(`Base de datos: Neon PostgreSQL conectada`);
  });
}

module.exports = app;

// Manejo de errores no capturados
process.on('error', (err) => {
  console.error('Error del proceso:', err);
});
