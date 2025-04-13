const { exec } = require("child_process");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = 9000;

// Middleware para processar o corpo do JSON
app.use(bodyParser.json());

// Rota do webhook
app.post("/webhook", (req, res) => {
  // Verifique se o evento é um push
  if (req.headers['x-github-event'] === 'push') {
    console.log("Evento push recebido!");

    // Frontend build
    exec(
      `cd /var/www/PlanejadorDeGastosDasGalaxias/frontend && pnpm i && export $(grep -v '^#' .env | xargs) && pnpm build`,
      (err, stdout, stderr) => {
        if (err) {
          console.error(`Erro no frontend: ${stderr}`);
          return;
        }
        console.log(`Frontend: ${stdout}`);

        // Backend restart
        exec(
          `cd /var/www/PlanejadorDeGastosDasGalaxias/backend && pnpm i && pm2 restart backend-planejador`,
          (err, stdout, stderr) => {
            if (err) {
              console.error(`Erro no backend: ${stderr}`);
              return;
            }
            console.log(`Backend: ${stdout}`);
          }
        );
      }
    );
    res.status(200).send("Webhook de push recebido e processamento iniciado.");
  } else {
    res.status(200).send("Evento não é um push. Ignorando.");
  }
});

app.listen(PORT, () => {
  console.log(`Webhook escutando na porta ${PORT}`);
});
