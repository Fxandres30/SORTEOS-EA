require("dotenv").config();
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

// 🔹 Validar variables de entorno
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

// 🔹 Función de autenticación
async function autenticarUsuario(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Error al autenticar:", error.message);
      return null;
    }

    console.log("✅ Usuario autenticado:", data.user);
    return data.session.access_token; // Retorna el token de autenticación
  } catch (err) {
    console.error("❌ Error inesperado:", err);
    return null;
  }
}

// 🔹 Autenticación de prueba
(async () => {
  const token = await autenticarUsuario("juan@example.com", "123456");
  if (token) {
    console.log("🔹 Token recibido:", token);
  } else {
    console.log("❌ No se pudo autenticar al usuario.");
  }
})();

module.exports = { pool, supabase, autenticarUsuario };
