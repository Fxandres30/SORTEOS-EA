const mercadopago = require('mercadopago');

// Configura las credenciales de Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

module.exports = mercadopago;
