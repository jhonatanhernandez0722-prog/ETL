#!/usr/bin/env node
/**
 * Script para inicializar la BD con datos de prueba
 * Uso: node init-db.js
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Obtener la URL de conexión del entorno
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Función para hashear contraseña
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + 'salt_health_analytics')
    .digest('hex');
}

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Iniciando BD...');
    
    // Crear tabla de roles si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla roles verificada');
    
    // Insertar roles por defecto
    await client.query(`
      INSERT INTO roles (nombre) VALUES 
      ('Administrador'), 
      ('Medico'), 
      ('Analista')
      ON CONFLICT (nombre) DO NOTHING;
    `);
    console.log('✓ Roles creados/verificados');
    
    // Crear tabla de usuarios si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol_id INTEGER REFERENCES roles(id),
        estado VARCHAR(20) DEFAULT 'activo',
        fecha_ultimo_acceso TIMESTAMP,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla usuarios verificada');
    
    // Insertar usuario admin
    const adminHash = hashPassword('admin123');
    try {
      await client.query(`
        INSERT INTO usuarios (email, nombre, password_hash, rol_id, estado) 
        SELECT $1, $2, $3, id, $4
        FROM roles 
        WHERE nombre = 'Administrador'
        ON CONFLICT (email) DO NOTHING;
      `, ['admin', 'Administrador', adminHash, 'activo']);
      console.log('✓ Usuario admin creado/verificado');
    } catch (err) {
      console.log('⚠ Usuario admin ya existe:', err.message);
    }
    
    // Insertar usuario medico
    const medicoHash = hashPassword('medico123');
    try {
      await client.query(`
        INSERT INTO usuarios (email, nombre, password_hash, rol_id, estado) 
        SELECT $1, $2, $3, id, $4
        FROM roles 
        WHERE nombre = 'Medico'
        ON CONFLICT (email) DO NOTHING;
      `, ['medico', 'Médico de Prueba', medicoHash, 'activo']);
      console.log('✓ Usuario medico creado/verificado');
    } catch (err) {
      console.log('⚠ Usuario medico ya existe:', err.message);
    }
    
    // Crear tabla de consultas si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultas (
        id SERIAL PRIMARY KEY,
        paciente_id VARCHAR(100),
        fecha_consulta DATE DEFAULT CURRENT_DATE,
        presion_sistolica INTEGER,
        presion_diastolica INTEGER,
        glucosa DECIMAL(10, 2),
        temperatura DECIMAL(5, 2),
        frecuencia_cardiaca INTEGER,
        saturacion_oxigeno DECIMAL(5, 2),
        colesterol DECIMAL(10, 2),
        riesgo_nivel VARCHAR(20),
        usuario_medico_id INTEGER REFERENCES usuarios(id),
        diagnostico_preliminar TEXT,
        notas TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla consultas verificada');
    
    // Crear tabla de pacientes si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id VARCHAR(100) PRIMARY KEY,
        nombres VARCHAR(100) NOT NULL,
        apellidos VARCHAR(100) NOT NULL,
        edad INTEGER,
        sexo VARCHAR(20),
        peso DECIMAL(8, 2),
        altura DECIMAL(5, 2),
        imc DECIMAL(8, 2),
        estado VARCHAR(20) DEFAULT 'activo',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabla pacientes verificada');
    
    // Insertar usuario analista
    const analistaHash = hashPassword('analista123');
    try {
      await client.query(`
        INSERT INTO usuarios (email, nombre, password_hash, rol_id, estado) 
        SELECT $1, $2, $3, id, $4
        FROM roles 
        WHERE nombre = 'Analista'
        ON CONFLICT (email) DO NOTHING;
      `, ['analista', 'Analista de Prueba', analistaHash, 'activo']);
      console.log('✓ Usuario analista creado/verificado');
    } catch (err) {
      console.log('⚠ Usuario analista ya existe:', err.message);
    }
    
    console.log('\n✓ Base de datos inicializada correctamente');
    console.log('\nCredenciales de prueba:');
    console.log('Admin:    admin / admin123');
    console.log('Medico:   medico / medico123');
    console.log('Analista: analista / analista123');
    
  } catch (error) {
    console.error('ERROR durante inicialización:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
