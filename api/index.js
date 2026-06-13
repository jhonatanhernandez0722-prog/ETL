// Manejador de Vercel Serverless para Express
const app = require('../server');

// Vercel necesita una función manejadora, no solo la app
// Express app es compatible con (req, res) signature
module.exports = app;
