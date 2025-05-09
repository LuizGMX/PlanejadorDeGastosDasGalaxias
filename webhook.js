const https = require("https");
const fs = require("fs");
const express = require("express");
const { exec } = require("child_process");
const app = express();
const PORT = 9000;
const domain = "planejadordasgalaxias.com.br";

// Caminhos para os certificados SSL gerados pelo Certbot
const options = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${domain}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${domain}/cert.pem`),
    ca: fs.readFileSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`), // Cadeia de certificação
};

// Removendo o middleware de processamento JSON global
// app.use(express.json());

// Rota do webhook - processando o JSON manualmente
app.post("/github-webhook", (req, res) => {
    // Processamos o corpo da requisição manualmente
    let data = '';
    
    req.on('data', chunk => {
        data += chunk;
    });
    
    req.on('end', () => {
        // Processamento só ocorre quando todos os dados foram recebidos
        try {
            // Tentar fazer parse do JSON, mas não é necessário para este webhook
            // const payload = JSON.parse(data);
            
            // Verificamos o header diretamente
            if (req.headers['x-github-event'] === 'push') {
                console.log("Evento push recebido!");

                console.log(`executando comando: cd /var/www/pgg/frontend && pnpm i && export $(grep -v '^#' .env | xargs) && pnpm build`)

                exec(
                    `git pull && cd /var/www/pgg/frontend && pnpm i && export $(grep -v '^#' .env | xargs) && pnpm build`,
                    (err, stdout, stderr) => {
                        if (err) {
                            console.error(`Erro no frontend: ${stderr}`);
                            return;
                        }
                        console.log(`Frontend: ${stdout}`);

                        console.log(`executando comando: cd /var/www/pgg/backend && pnpm i && pm2 restart backend-planejador`)

                        exec(
                            `cd /var/www/pgg/backend && pnpm i && export $(grep -v '^#' .env | xargs) && pm2 restart backend-planejador`,
                            (err, stdout, stderr) => {
                                if (err) {
                                    console.error(`Erro no backend: ${stderr}`);
                                    return;
                                }
                                console.log(`Backend: ${stdout}`);
                                console.log("WEBHOOK FINALIZADO COM SUCESSO!!!!!");
                            }
                        );
                    }
                );
                
                res.status(200).send("Webhook de push recebido e processamento iniciado.");
            } else {
                res.status(200).send("Evento não é um push. Ignorando.");
            }
        } catch (error) {
            console.error("Erro ao processar webhook:", error);
            res.status(400).send("Erro ao processar webhook");
        }
    });
});

// Iniciar servidor HTTPS
https.createServer(options, app).listen(PORT, () => {
    console.log(`Webhook escutando em https://localhost:${PORT}`);
});

