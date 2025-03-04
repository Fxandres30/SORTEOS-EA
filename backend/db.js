require("dotenv").config();
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

// Validar variables de entorno
if (!process.env.DATABASE_URL || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("❌ ERROR: Variables de entorno faltantes. Verifica el archivo .env.");
}

// 🔹 Configuración de PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Necesario para conexiones seguras
});

// 🔹 Conexión a Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

console.log("✅ Conexión a PostgreSQL y Supabase establecida correctamente.");

module.exports = { pool, supabase };
