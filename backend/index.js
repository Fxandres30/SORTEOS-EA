require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool, supabase } = require("./db");
const mercadopago = require("mercadopago");
const interRoutes = require("./inter"); // Importa las rutas desde inter.js
const { sendEmail } = require("./email"); // Importa la función para enviar correos

const app = express();
const PORT = process.env.PORT || 5000;

// Configuraciones
app.use(cors());
app.use(express.json());

// Configuración de Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// Rutas
app.use("/api", interRoutes); // Usa las rutas definidas en inter.js bajo el prefijo /api

// Ruta de prueba para verificar que el servidor está activo
app.get("/", (req, res) => res.send("✅ API funcionando correctamente"));

// Ruta de prueba para enviar correos con Amazon SES
app.get("/send-test-email", async (req, res) => {
  try {
    await sendEmail("destinatario@correo.com", "Prueba SES", "<h1>¡Correo enviado con éxito!</h1>");
    res.send("Correo enviado correctamente.");
  } catch (error) {
    res.status(500).send("Error enviando correo.");
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

