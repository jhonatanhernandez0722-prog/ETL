// Este archivo redirige todo a Express en server.js
const app = require('../server');

// Vercel Serverless Functions esperan un manejador (req, res)
// pero Express es una app que necesita ser montada directamente
// Por eso no podemos simplemente exportar app

// Solución: permitir que el archivo sea ignorado y que Vercel
// use la configuración en vercel.json para pasar todo a server.js

module.exports = app;
