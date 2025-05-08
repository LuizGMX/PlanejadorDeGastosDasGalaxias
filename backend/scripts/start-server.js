/**
 * Script para iniciar o servidor com verificações avançadas
 * e recuperação automática em caso de falhas
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { testConnection } from '../config/db.js';

// Configurar caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(rootDir, '.env') });

// Configurações
const MAX_RESTART_COUNT = 5;
const RESTART_DELAY = 5000; // 5 segundos
let restartCount = 0;
let serverProcess = null;

// Função para verificar pré-requisitos
async function checkPrerequisites() {
  console.log('🔍 Verificando pré-requisitos antes de iniciar o servidor...');
  
  // Verificar se o arquivo .env existe ou criar um padrão
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️ Arquivo .env não encontrado. Criando padrão...');
    const defaultEnvContent = `
DB_HOST=localhost
DB_NAME=planejador
DB_USER=root
DB_PASSWORD=
PORT=5000
API_PREFIX=api
NODE_ENV=development
JWT_SECRET=planejador-secret-key
`;
    fs.writeFileSync(envPath, defaultEnvContent);
    console.log('✅ Arquivo .env padrão criado!');
    dotenv.config({ path: envPath });
  }
  
  // Verificar a conexão com o banco de dados
  try {
    console.log('🔄 Verificando conexão com o banco de dados...');
    await testConnection();
    console.log('✅ Banco de dados conectado e pronto!');
  } catch (error) {
    console.error('❌ Falha ao conectar ao banco de dados:', error);
    console.log('⚠️ O servidor será iniciado, mas pode haver problemas com operações de banco de dados.');
  }
  
  // Verificar porta disponível
  const checkPort = () => {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      const port = process.env.PORT || 5000;
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`⚠️ A porta ${port} já está em uso. Por favor, encerre o processo que a está utilizando.`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  };
  
  const portAvailable = await checkPort();
  if (!portAvailable) {
    console.log('⚠️ Tentando forçar a liberação da porta...');
    try {
      // No Windows, você precisa de ferramentas adicionais para isso
      // No Linux/Mac, você pode usar fuser -k
      console.log('Por favor, encerre manualmente o processo usando a porta 5000');
    } catch (e) {
      console.error('Não foi possível liberar a porta automaticamente');
    }
  }
  
  return true;
}

// Função para iniciar o servidor
function startServer() {
  console.log(`🚀 Iniciando servidor (tentativa ${restartCount + 1} de ${MAX_RESTART_COUNT})...`);
  
  // Caminho para o arquivo server.js
  const serverPath = path.join(rootDir, 'server.js');
  
  // Criar processo do servidor
  serverProcess = spawn('node', [serverPath], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Erro ao iniciar o servidor:', error);
    restartServer();
  });
  
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`❌ Servidor encerrado com código ${code}, sinal: ${signal}`);
      restartServer();
    } else {
      console.log('🛑 Servidor encerrado normalmente.');
    }
  });
  
  // Registrar o PID
  if (serverProcess.pid) {
    fs.writeFileSync(path.join(rootDir, 'pid.log'), `${serverProcess.pid}`);
    console.log(`✅ Servidor iniciado com PID ${serverProcess.pid}`);
  }
}

// Função para reiniciar o servidor
function restartServer() {
  restartCount++;
  
  if (restartCount < MAX_RESTART_COUNT) {
    console.log(`⚠️ Reiniciando servidor em ${RESTART_DELAY / 1000} segundos...`);
    setTimeout(() => {
      if (serverProcess) {
        try {
          process.kill(serverProcess.pid, 'SIGKILL');
        } catch (e) {
          // Ignorar erros ao tentar matar o processo
        }
      }
      startServer();
    }, RESTART_DELAY);
  } else {
    console.error('❌ Número máximo de tentativas de reinício atingido. Desistindo.');
    process.exit(1);
  }
}

// Tratamento de sinais para encerramento limpo
process.on('SIGINT', () => {
  console.log('\n🛑 Sinal SIGINT recebido. Encerrando servidor...');
  if (serverProcess) {
    process.kill(serverProcess.pid, 'SIGINT');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Sinal SIGTERM recebido. Encerrando servidor...');
  if (serverProcess) {
    process.kill(serverProcess.pid, 'SIGTERM');
  }
  process.exit(0);
});

// Iniciar o processo
(async () => {
  const ready = await checkPrerequisites();
  if (ready) {
    startServer();
  } else {
    console.error('❌ Não foi possível iniciar o servidor devido a falhas nos pré-requisitos.');
    process.exit(1);
  }
})(); 