// server.js

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import { sequelize } from './models/index.js';
import seedDatabase from './seeders/index.js';
import { writeFileSync } from 'fs';
import { telegramService } from './services/telegramService.js';
import app from './app.js';
import https from 'https';
import fs from 'fs';
import http from 'http'; // Para desenvolvimento
import path from 'path';
import { fileURLToPath } from 'url';

// Caminho para o arquivo de migração
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationScriptPath = path.join(__dirname, 'models', 'remove-subcategories-with-models.js');

dotenv.config();

// Servir arquivos estáticos do frontend (SPA)
const staticPath = path.join(__dirname, '../frontend/build'); // Alterado para apontar para o build do frontend
app.use(express.static(staticPath));

// Rota fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Definir o servidor
let server;

if (process.env.NODE_ENV === 'production') {
  // Carregar certificados apenas se for ambiente de produção
  const privateKey = fs.readFileSync('/etc/letsencrypt/live/planejadordasgalaxias.com.br/privkey.pem', 'utf8');
  const certificate = fs.readFileSync('/etc/letsencrypt/live/planejadordasgalaxias.com.br/cert.pem', 'utf8');
  const ca = fs.readFileSync('/etc/letsencrypt/live/planejadordasgalaxias.com.br/chain.pem', 'utf8');

  const credentials = { key: privateKey, cert: certificate, ca: ca };

  // Iniciar servidor HTTPS na porta 5000
  server = https.createServer(credentials, app);
  server.listen(5000, () => {
    console.log('🚀 Servidor HTTPS rodando na porta 5000 em modo produção');
  });
} else {
  // Iniciar servidor HTTP na porta 5000 para desenvolvimento
  server = http.createServer(app);
  server.listen(5000, () => {
    console.log('🚀 Servidor HTTP rodando na porta 5000 em modo desenvolvimento');
  });
}

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Salva o PID do processo em um arquivo
writeFileSync('./pid.log', process.pid.toString());

// Função para desligar o servidor graciosamente
const gracefulShutdown = (server) => {
  console.log('Iniciando desligamento gracioso...');
  
  server.close(() => {
    console.log('Servidor HTTP fechado.');
    
    // Fechar conexão com banco de dados
    sequelize.close().then(() => {
      console.log('Conexão com banco de dados fechada.');
      process.exit(0);
    }).catch((err) => {
      console.error('Erro ao fechar conexão com banco de dados:', err);
      process.exit(1);
    });
  });

  // Se o servidor não fechar em 10s, forçar
  setTimeout(() => {
    console.error('Não foi possível fechar conexões em tempo, forçando saída');
    process.exit(1);
  }, 10000);
};

// Função para iniciar o servidor
const startServer = async () => {
  try {
    // Autenticar conexão com banco
    await sequelize.authenticate();
    console.log('Conexão com banco estabelecida com sucesso.');

    // Executar script de remoção de subcategorias
    try {
      console.log('Executando migração para remover subcategorias...');
      try {
        // Tentar importar o script de migração
        const migrationModule = await import(migrationScriptPath);
        if (migrationModule && migrationModule.default) {
          await migrationModule.default(sequelize);
          console.log('Migração de subcategorias concluída com sucesso.');
        } else {
          console.warn('Módulo de migração importado, mas não contém função padrão.');
        }
      } catch (importError) {
        console.warn('Não foi possível importar o script de migração:', importError.message);
        console.log('Tentando solução alternativa...');
        // Executa alterações SQL diretamente
        await executeManualMigration();
      }
    } catch (migrationError) {
      console.warn('Aviso ao executar migração de subcategorias:', migrationError.message);
      console.log('Continuando inicialização do servidor...');
    }

    // Função para executar migração manualmente com SQL
    async function executeManualMigration() {
      const transaction = await sequelize.transaction();
      try {
        console.log('Executando migração manual para remover subcategorias');
        
        // Tabelas para verificar
        const tables = ['expenses', 'incomes', 'recurrence_rules'];
        
        // Verificar e remover colunas subcategory_id de cada tabela
        for (const table of tables) {
          try {
            await sequelize.query(
              `ALTER TABLE ${table} DROP COLUMN IF EXISTS subcategory_id`,
              { transaction }
            );
            console.log(`Tentativa de remover subcategory_id da tabela ${table} concluída`);
          } catch (error) {
            console.log(`Erro ao remover coluna de ${table}:`, error.message);
          }
        }
        
        // Tentar remover a tabela subcategories
        try {
          await sequelize.query(
            `DROP TABLE IF EXISTS subcategories`,
            { transaction }
          );
          console.log('Tentativa de remover tabela subcategories concluída');
        } catch (error) {
          console.log('Erro ao remover tabela subcategories:', error.message);
        }
        
        await transaction.commit();
        console.log('Migração manual concluída');
      } catch (error) {
        await transaction.rollback();
        console.error('Erro na migração manual:', error);
      }
    }

    // Sincronizar modelos com banco
    await sequelize.sync({ force: false, alter: true });
    
    console.log('Modelos sincronizados com banco de dados.');

    // Executar seeders apenas se a variável de ambiente estiver configurada
    if (process.env.RUN_SEEDERS === 'true') {
      await seedDatabase();
      console.log('Dados iniciais carregados com sucesso.');
    } else {
      console.log('Seeders ignorados. Configure RUN_SEEDERS=true para executá-los.');
    }

    // Inicializar serviço do Telegram se token estiver configurado
    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await telegramService.init();
        console.log('Bot do Telegram inicializado com sucesso');
      } catch (error) {
        console.error('Erro ao inicializar bot do Telegram:', error);
      }
    }

    // Configurar handlers para desligamento gracioso
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();