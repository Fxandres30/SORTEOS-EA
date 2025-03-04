require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pool, supabase } = require("./db");
const mercadopago = require("mercadopago");
const app = express();
app.use(cors());
app.use(express.json());

const PRECIO_BOLETO = 10;
mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
 
app.get("/", (req, res) => res.send("✅ API funcionando correctamente"));
 
const generarNumeroBoleto = async () => {
  while (true) {
    const numeroAleatorio = Math.floor(100000 + Math.random() * 900000);
    const { data, error } = await supabase.from("boletos").select("numero").eq("numero", numeroAleatorio);
    if (error) throw new Error("Error al generar número de boleto.");
    if (!data || data.length === 0) return numeroAleatorio;
  }
};
 
app.post("/comprar-boletos", async (req, res) => {
  const { comprador_nombre, comprador_email, comprador_telefono, cantidad, metodo_pago } = req.body;

  if (!comprador_nombre || !comprador_email || !comprador_telefono || !cantidad || cantidad <= 0 || !metodo_pago) {
    return res.status(400).json({ error: "⚠️ Todos los campos son obligatorios." });
  }

  try {
    const monto = cantidad * PRECIO_BOLETO;
    const { data: pago, error: errorPago } = await supabase.from("pagos").insert([{ 
      comprador_nombre, 
      comprador_email, 
      comprador_telefono, 
      cantidad_boletos: cantidad, 
      metodo_pago, 
      monto, 
      estado_pago: "pendiente"
    }]).select("id").single();
    if (errorPago) throw errorPago;
    
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


    const { error: errorBoletos } = await supabase.from("boletos").insert(boletos);
    if (errorBoletos) throw errorBoletos;
    
    res.json({ mensaje: "🎉 Boletos comprados con éxito", boletos });
  } catch (error) {

    res.status(500).json({ error: "❌ Error interno", detalles: error.message });
  }
});

app.post("/crear-preferencia", async (req, res) => {
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

app.post("/webhook", async (req, res) => {
  const payment = req.body;
  if (payment.type === "payment") {
    const paymentData = await mercadopago.payment.findById(payment.data.id);
    const estado = paymentData.body.status;
    const pagoId = paymentData.body.external_reference;
    await supabase.from("pagos").update({ estado_pago: estado }).eq("id", pagoId);
  }
  res.sendStatus(200);
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
