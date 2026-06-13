const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();

// ============================================================================
// CONFIGURACIÓN DE CONEXIÓN A NEON POSTGRESQL
// ============================================================================

// Validar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no está configurada en las variables de entorno');
  console.error('Por favor asegúrate de que .env.local existe y contiene DATABASE_URL');
  process.exit(1);
}

console.log('INFO: Conectando a Neon PostgreSQL...');
console.log('Base de datos:', process.env.DATABASE_URL.split('@')[1]?.split('/')[1] || 'desconocida');

// Configurar Pool de conexiones a Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                    // Máximo de conexiones
  idleTimeoutMillis: 30000,  // Timeout de inactividad
  connectionTimeoutMillis: 5000  // Timeout de conexión
});

// Manejo de eventos del pool
pool.on('error', (err) => {
  console.error('ERROR del pool de conexiones inesperado:', err);
});

pool.on('connect', () => {
  console.log('Conexión al pool establecida');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// SERVIR ARCHIVOS ESTÁTICOS E INTERFAZ WEB
// ============================================================================

// Servir archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static('.'));
app.use(express.static('./public'));

// Ruta raíz: servir index.html (SPA)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback para rutas no encontradas en archivos estáticos
app.get('/:param', (req, res, next) => {
  // Si no es una ruta API, servir index.html
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
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      message: 'Conexión a BD exitosa',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('ERROR en /api/health:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Fallo en conexión a BD',
      details: error.message
    });
  }
});

// Ruta de verificación de variables de entorno
app.get('/api/debug/env', async (req, res) => {
  res.json({
    hasDatabase: !!process.env.DATABASE_URL,
    databaseHost: process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'no configurada',
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
    const result = await pool.query(
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
  
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.nombre, u.password_hash, r.nombre as rol
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.email = $1`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    
    // En producción, usar bcrypt para comparar contraseñas hasheadas
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    // Actualizar último acceso
    await pool.query(
      `UPDATE usuarios SET fecha_ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );
    
    res.json({
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RUTAS DE REPORTES Y ESTADÍSTICAS
// ============================================================================

// GET - Estadísticas de pacientes
app.get('/api/reportes/estadisticas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_pacientes,
         COUNT(CASE WHEN estado = 'activo' THEN 1 END) as pacientes_activos
       FROM pacientes`
    );
    
    const riesgos = await pool.query(
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
