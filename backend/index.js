require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool, supabase } = require("./db");
const app = express();
app.use(cors());
app.use(express.json());

const PRECIO_BOLETO = 10; // 💰 Ajusta el precio según tu lógica

// 🔹 Ruta de prueba para verificar que el servidor está activo
app.get("/", (req, res) => res.send("✅ API funcionando correctamente"));

// 🔹 Función para generar un número de boleto aleatorio único
const generarNumeroBoleto = async () => {
  while (true) {
    const numeroAleatorio = Math.floor(100000 + Math.random() * 900000); // Número de 6 cifras
    const { data, error } = await supabase
      .from("boletos")
      .select("numero")
      .eq("numero", numeroAleatorio);

    if (error) {
      console.error("❌ Error al verificar número de boleto:", error.message);
      throw new Error("Error al generar número de boleto.");
    }

    if (!data || data.length === 0) {
      return numeroAleatorio;
    }
  }
};

// 🔹 Endpoint para comprar boletos
app.post("/comprar-boletos", async (req, res) => {
  const { comprador_nombre, comprador_email, comprador_telefono, cantidad, metodo_pago } = req.body;

  if (!comprador_nombre || !comprador_email || !comprador_telefono || !cantidad || cantidad <= 0 || !metodo_pago) {
    return res.status(400).json({ error: "⚠️ Todos los campos son obligatorios, incluyendo el método de pago." });
  }

  try {
    const monto = cantidad * PRECIO_BOLETO; // ✅ Calculamos el monto antes de insertar

    // 🔹 Insertar el pago en la tabla "pagos"
    console.log("🔹 Insertando pago en la base de datos...");
    const { data: pago, error: errorPago } = await supabase
      .from("pagos")
      .insert([{ 
        comprador_nombre, 
        comprador_email, 
        comprador_telefono, 
        cantidad_boletos: cantidad, 
        metodo_pago, // ✅ Agregado para evitar error de null
        monto, // ✅ Agregado para evitar error de null
        estado_pago: "pendiente"
      }])
      .select("id")
      .single();

    if (errorPago) {
      console.error("❌ Error en la inserción del pago:", errorPago.message);
      return res.status(500).json({ error: "❌ Error al insertar el pago", detalles: errorPago.message });
    }

    console.log("✅ Pago insertado correctamente:", pago);

    // 🔹 Generar y registrar los boletos
    const boletos = [];
    for (let i = 0; i < cantidad; i++) {
      const numeroBoleto = await generarNumeroBoleto();
      boletos.push({
        numero: numeroBoleto,
        comprador_nombre,
        comprador_email,
        comprador_telefono,
        pago_id: pago.id // ✅ Corregido, ahora sí se asigna el ID del pago
      });
    }

    // 🔹 Insertar boletos en la base de datos
    console.log("🔹 Insertando boletos en la base de datos...");
    const { error: errorBoletos } = await supabase.from("boletos").insert(boletos);
    if (errorBoletos) throw errorBoletos;

    console.log("✅ Boletos insertados correctamente:", boletos);

    res.json({ mensaje: "🎉 Boletos comprados con éxito", boletos });
  } catch (error) {
    console.error("❌ Error en la compra:", error.message);
    res.status(500).json({ error: "❌ Error interno", detalles: error.message });
  }
});

// 🔹 Prueba conexión a PostgreSQL
app.get("/test-db", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    res.json({ message: "✅ Conexión exitosa a PostgreSQL", time: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: "❌ Error al conectar con PostgreSQL", detalles: error.message });
  }
});

// 🔹 Prueba conexión a Supabase
app.get("/test-supabase", async (req, res) => {
  try {
    const { data, error } = await supabase.from("boletos").select("*").limit(1);
    if (error) throw error;
    res.json({ message: "✅ Conexión exitosa a Supabase", data });
  } catch (error) {
    res.status(500).json({ error: "❌ Error al conectar con Supabase", detalles: error.message });
  }
});

// 🔹 Configurar y ejecutar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
