const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Configurar Express
const app = express();
app.use(cors());
app.use(express.json());

// Conectar con Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Ruta de prueba
app.get("/", (req, res) => res.send("API funcionando"));

// Función para generar un número de boleto aleatorio único
const generarNumeroBoleto = async () => {
    while (true) {
        const numeroAleatorio = Math.floor(100000 + Math.random() * 900000); // Número de 6 cifras
        const { data, error } = await supabase
            .from("boletos")
            .select("numero")
            .eq("numero", numeroAleatorio);

        if (!error && data.length === 0) {
            return numeroAleatorio;
        }
    }
};

// Endpoint para comprar boletos
app.post("/comprar-boletos", async (req, res) => {
    const { comprador_nombre, comprador_email, comprador_telefono, cantidad } = req.body;

    if (!comprador_nombre || !comprador_email || !comprador_telefono || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: "Todos los campos son obligatorios y la cantidad debe ser mayor a 0." });
    }

    try {
        const boletos = [];
        for (let i = 0; i < cantidad; i++) {
            const numeroBoleto = await generarNumeroBoleto();
            boletos.push({
                numero: numeroBoleto,
                comprador_nombre,
                comprador_email,
                comprador_telefono
            });
        }

        const { data, error } = await supabase.from("boletos").insert(boletos);

        if (error) {
            throw error;
        }

        res.json({ mensaje: "Boletos comprados con éxito", boletos });
    } catch (error) {
        res.status(500).json({ error: "Error al comprar boletos", detalles: error.message });
    }
});

// Configurar el puerto y ejecutar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
