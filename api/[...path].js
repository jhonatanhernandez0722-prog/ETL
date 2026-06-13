// Este archivo redirige todo a Express en server.js
const app = require('../server');

// Vercel espera un manejador exportado, no una aplicación Express
// Debemos exportar una función que Vercel pueda invocar
module.exports = (req, res) => {
  // Pasar la solicitud a Express
  return app(req, res);
};
