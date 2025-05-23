import https from "https";
import fs from "fs";
import express from "express";
import bodyParser from "body-parser";
import { exec } from "child_process";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 9000;
const domain = "planejadordasgalaxias.com.br";

// Caminhos para os certificados SSL gerados pelo Certbot
const options = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${domain}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${domain}/cert.pem`),
    ca: fs.readFileSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`), // Cadeia de certificação
};

// Middleware para processar o corpo do JSON
app.use(bodyParser.json());

// Rota do webhook
app.post("/github-webhook", (req, res) => {
    if (req.headers['x-github-event'] === 'push') {
        console.log("Evento push recebido!");

        console.log(`executando comando: cd /var/www/PlanejadorDeGastosDasGalaxias/frontend && pnpm i && export $(grep -v '^#' .env | xargs) && pnpm build`)

        exec(
            `git pull && cd /var/www/PlanejadorDeGastosDasGalaxias/frontend && pnpm i && export $(grep -v '^#' .env | xargs) && pnpm build`,
            async (err, stdout, stderr) => {
                if (err) {
                    console.error(`Erro no frontend: ${stderr}`);
                    return;
                }
                console.log(`Frontend: ${stdout}`);

                console.log(`executando comando: cd /var/www/PlanejadorDeGastosDasGalaxias/backend && pnpm i && pm2 restart backend-planejador`)

                exec(
                    `cd /var/www/PlanejadorDeGastosDasGalaxias/backend && pnpm i && export $(grep -v '^#' .env | xargs) && pm2 restart backend-planejador`,
                    (err, stdout, stderr) => {
                        if (err) {
                            console.error(`Erro no backend: ${stderr}`);
                            return;
                        }
                        console.log(`Backend: ${stdout}`);
                        console.log("WEBHOOK FINALIZADO COM SUCESSO!!!!!");

                        // Enviar e-mail de notificação
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'planejadordegastosdasgalaxias@gmail.com',
                                pass: 'vzuwyhqfusbbzsps',
                            },
                        });

                        const msg = {
                            from: '"Planejador Das Galáxias" <planejadordegastosdasgalaxias@gmail.com>',
                            to: "luizguestape54@hotmail.com",
                            subject: 'Webhook finalizado com sucesso',
                            html: `
                                <h1> Webhook finalizado com sucesso</h1>
                            `,
                        };
                        transporter.sendMail(msg);

                    }

                );
            }
        );


        res.status(200).send("Webhook de push recebido e processamento iniciado.");
    } else {
        res.status(200).send("Evento não é um push. Ignorando.");
    }
});

// Iniciar servidor HTTPS
https.createServer(options, app).listen(PORT, () => {
    console.log(`Webhook escutando em https://localhost:${PORT}`);
});

