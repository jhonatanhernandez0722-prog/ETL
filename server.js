const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const multer = require('multer');
const XLSX = require('xlsx');

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
  // Hashear la contraseña proporcionada con el mismo salt
  const providedHash = crypto
    .createHash('sha256')
    .update((providedPassword || '') + 'salt_health_analytics')
    .digest('hex');
  
  // Comparar hashes directamente (ambos son strings hexadecimales)
  return String(storedPassword || '') === providedHash;
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configurar multer para archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV y Excel (XLSX, XLS)'));
    }
  }
});

// ============================================================================
// SERVIR ARCHIVOS ESTÁTICOS E INTERFAZ WEB
// ============================================================================

// Servir archivos estáticos (CSS, JS, imágenes, etc.) con rutas absolutas
const staticDir = path.join(__dirname, '.');
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));
app.use(express.static(staticDir));

// Rutas explícitas para archivos JS críticos
app.get('/patient-import-manager.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'patient-import-manager.js'), { 
    headers: { 'Content-Type': 'application/javascript' } 
  });
});

app.get('/null-value-imputation.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'null-value-imputation.js'), {
    headers: { 'Content-Type': 'application/javascript' }
  });
});

app.get('/null-value-imputation-ui.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'null-value-imputation-ui.js'), {
    headers: { 'Content-Type': 'application/javascript' }
  });
});

// ============================================================================
// ENDPOINT DE INICIALIZACIÓN DE BASE DE DATOS (DESARROLLO/ADMIN)
// ============================================================================

app.post('/api/system/init-db', async (req, res) => {
  const { secretKey } = req.body;
  
  // Verificar clave secreta
  const expectedKey = process.env.INIT_SECRET_KEY || 'dev-secret-12345';
  if (secretKey !== expectedKey) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  
  try {
    console.log('Iniciando BD...');
    const client = await pool.connect();
    
    // Crear tabla de roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insertar roles
    await client.query(`
      INSERT INTO roles (nombre) VALUES 
      ('Administrador'), 
      ('Medico'), 
      ('Analista')
      ON CONFLICT (nombre) DO NOTHING;
    `);
    
    // Crear tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol_id INTEGER REFERENCES roles(id),
        estado VARCHAR(20) DEFAULT 'activo',
        last_access_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insertar usuario admin
    const adminHash = crypto
      .createHash('sha256')
      .update('admin123' + 'salt_health_analytics')
      .digest('hex');
    
    await client.query(`
      INSERT INTO usuarios (email, nombre, password_hash, rol_id, estado) 
      SELECT $1, $2, $3, id, $4
      FROM roles 
      WHERE nombre = 'Administrador'
      ON CONFLICT (email) DO NOTHING;
    `, ['admin', 'Administrador', adminHash, 'activo']);
    
    // Insertar usuario medico
    const medicoHash = crypto
      .createHash('sha256')
      .update('medico123' + 'salt_health_analytics')
      .digest('hex');
    
    await client.query(`
      INSERT INTO usuarios (email, nombre, password_hash, rol_id, estado) 
      SELECT $1, $2, $3, id, $4
      FROM roles 
      WHERE nombre = 'Medico'
      ON CONFLICT (email) DO NOTHING;
    `, ['medico', 'Médico de Prueba', medicoHash, 'activo']);
    
    // Insertar usuario analista
    const analistaHash = crypto
      .createHash('sha256')
      .update('analista123' + 'salt_health_analytics')
      .digest('hex');
    
    await client.query(`
      INSERT INTO usuarios (email, nombre, password_hash, rol_id, estado) 
      SELECT $1, $2, $3, id, $4
      FROM roles 
      WHERE nombre = 'Analista'
      ON CONFLICT (email) DO NOTHING;
    `, ['analista', 'Analista de Prueba', analistaHash, 'activo']);
    
    client.release();
    
    res.json({ 
      success: true, 
      message: 'Base de datos inicializada',
      users: [
        { email: 'admin', password: 'admin123', role: 'Administrador' },
        { email: 'medico', password: 'medico123', role: 'Medico' },
        { email: 'analista', password: 'analista123', role: 'Analista' }
      ]
    });
    
  } catch (error) {
    console.error('Error en init-db:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// POST - Importar pacientes desde archivo (CSV, XLSX)
app.post('/api/pacientes/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó archivo' });
  }

  try {
    let data = [];
    const fileName = req.file.originalname.toLowerCase();

    // Parsear archivo según tipo
    if (fileName.endsWith('.csv')) {
      // Procesar CSV
      const text = req.file.buffer.toString('utf-8');
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        return res.status(400).json({ error: 'Archivo CSV vacío' });
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || null;
        });
        if (row.nombres || row.apellidos) {
          data.push(row);
        }
      }
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Procesar Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet);
      
      // Normalizar claves (minúsculas)
      data = raw.map(row => {
        const normalized = {};
        Object.keys(row).forEach(key => {
          normalized[key.toLowerCase()] = row[key];
        });
        return normalized;
      }).filter(row => row.nombres || row.apellidos);

    } else {
      return res.status(400).json({ error: 'Formato de archivo no soportado. Use CSV o XLSX' });
    }

    if (data.length === 0) {
      return res.status(400).json({ error: 'No se encontraron registros válidos en el archivo' });
    }

    // Validar y insertar registros
    const results = {
      success: 0,
      failed: 0,
      errors: [],
      created: []
    };

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const nombres = String(row.nombres || '').trim();
        const apellidos = String(row.apellidos || '').trim();
        const edad = parseInt(row.edad) || null;
        const sexo = String(row.sexo || '').trim();
        const peso = parseFloat(row.peso) || null;
        const altura = parseFloat(row.altura) || null;
        
        // Validación básica
        if (!nombres || !apellidos) {
          results.failed++;
          results.errors.push(`Fila ${i + 2}: Nombres y apellidos son obligatorios`);
          continue;
        }

        // Generar ID único
        const id = `PAC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Calcular IMC si hay peso y altura
        let imc = null;
        if (peso && altura) {
          imc = parseFloat((peso / (altura * altura)).toFixed(2));
        }

        // Insertar en BD
        const result = await queryDb(
          `INSERT INTO pacientes (id, nombres, apellidos, edad, sexo, peso, altura, imc)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [id, nombres, apellidos, edad, sexo, peso, altura, imc]
        );

        results.success++;
        results.created.push(result.rows[0]);

      } catch (rowError) {
        results.failed++;
        results.errors.push(`Fila ${i + 2}: ${rowError.message}`);
      }
    }

    res.status(201).json({
      message: `Importación completada: ${results.success} registros insertados`,
      summary: {
        total: data.length,
        success: results.success,
        failed: results.failed
      },
      created: results.created,
      errors: results.errors.slice(0, 10) // Mostrar primeros 10 errores
    });

  } catch (error) {
    console.error('Error importando pacientes:', error);
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
