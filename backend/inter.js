const express = require("express");
const router = express.Router();
const { supabase } = require("./db");
const mercadopago = require("mercadopago");

const PRECIO_BOLETO = 10; // Ajusta el precio según tu lógica

// Función para generar un número de boleto aleatorio único
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

// Endpoint para comprar boletos
router.post("/comprar-boletos", async (req, res) => {
  const { comprador_nombre, comprador_email, comprador_telefono, cantidad, metodo_pago } = req.body;

  if (!comprador_nombre || !comprador_email || !comprador_telefono || !cantidad || cantidad <= 0 || !metodo_pago) {
    return res.status(400).json({ error: "⚠️ Todos los campos son obligatorios, incluyendo el método de pago." });
  }

  try {
    const monto = cantidad * PRECIO_BOLETO; // Calcula el monto total

    // Insertar el pago en la tabla "pagos"
    const { data: pago, error: errorPago } = await supabase
      .from("pagos")
      .insert([{ 
        comprador_nombre, 
        comprador_email, 
        comprador_telefono, 
        cantidad_boletos: cantidad, 
        metodo_pago, 
        monto, 
        estado_pago: "pendiente"
      }])
      .select("id")
      .single();

    if (errorPago) {
      console.error("❌ Error en la inserción del pago:", errorPago.message);
      return res.status(500).json({ error: "❌ Error al insertar el pago", detalles: errorPago.message });
    }

    // Generar y registrar los boletos
    const boletos = [];
    for (let i = 0; i < cantidad; i++) {
      const numeroBoleto = await generarNumeroBoleto();
      boletos.push({
        numero: numeroBoleto,
        comprador_nombre,
        comprador_email,
        comprador_telefono,
        pago_id: pago.id
      });
    }

    // Insertar boletos en la base de datos
    const { error: errorBoletos } = await supabase.from("boletos").insert(boletos);
    if (errorBoletos) throw errorBoletos;

    res.json({ mensaje: "🎉 Boletos comprados con éxito", boletos });
  } catch (error) {
    console.error("❌ Error en la compra:", error.message);
    res.status(500).json({ error: "❌ Error interno", detalles: error.message });
  }
});

// Ruta para crear una preferencia de pago en Mercado Pago
router.post("/crear-preferencia", async (req, res) => {
  const { cantidad, comprador_email } = req.body;

  if (!cantidad || cantidad <= 0 || !comprador_email) {
    return res.status(400).json({ error: "⚠️ Todos los campos son obligatorios." });
  }

  try {
    const preference = {
      items: [{ title: "Boleto de Rifa", unit_price: PRECIO_BOLETO, quantity: cantidad }],
      payer: { email: comprador_email },
      back_urls: { success: "http://localhost:3000/exito", failure: "http://localhost:3000/error" },
      auto_return: "approved"
    };
    const response = await mercadopago.preferences.create(preference);
    res.json({ id: response.body.id });
  } catch (error) {
    res.status(500).json({ error: "❌ Error al crear preferencia de pago", detalles: error.message });
  }
});

// Webhook para recibir notificaciones de Mercado Pago
router.post("/webhook", async (req, res) => {
  const payment = req.body;
  if (payment.type === "payment") {
    const paymentData = await mercadopago.payment.findById(payment.data.id);
    const estado = paymentData.body.status;
    const pagoId = paymentData.body.external_reference;
    await supabase.from("pagos").update({ estado_pago: estado }).eq("id", pagoId);
  }
  res.sendStatus(200);
});

module.exports = router;
