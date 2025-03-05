const AWS = require("aws-sdk");
require("dotenv").config();

const ses = new AWS.SES({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function sendEmail(to, subject, body) {
  const params = {
    Source: process.env.AWS_SES_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body } },
    },
  };

  try {
    await ses.sendEmail(params).promise();
    console.log("Correo enviado con éxito.");
  } catch (error) {
    console.error("Error al enviar correo:", error);
  }
}

module.exports = { sendEmail };
