/**
 * Script para iniciar o servidor de forma mais robusta
 * Use com: node startServer.js
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEFAULT_PORT = 5000;
const ALTERNATIVE_PORTS = [5001, 5002, 5003, 5005, 5010];

console.log('🚀 Iniciando o servidor...');

// Verificar e encerrar processos que estão usando a porta padrão
const checkAndKillProcessOnPort = (port) => {
  return new Promise((resolve) => {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    console.log(`🔍 Verificando se a porta ${port} está em uso...`);
    
    exec(command, (error, stdout, stderr) => {
      if (error && (process.platform !== 'win32' || error.code !== 1)) {
        console.log(`✅ Porta ${port} parece estar livre.`);
        resolve(false);
        return;
      }
      
      if (!stdout.trim()) {
        console.log(`✅ Porta ${port} está livre.`);
        resolve(false);
        return;
      }
      
      console.log(`⚠️ Porta ${port} está em uso por algum processo.`);
      console.log(stdout);
      
      // Extrair PIDs
      let pids = [];
      if (process.platform === 'win32') {
        // Windows
        const lines = stdout.split('\n').filter(line => line.trim() !== '');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (!pids.includes(pid) && pid !== '0') {
              pids.push(pid);
            }
          }
        });
      } else {
        // Linux/macOS
        const lines = stdout.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 0) {
          lines.shift(); // Remover cabeçalho
        }
        
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const pid = parts[1];
            if (!pids.includes(pid)) {
              pids.push(pid);
            }
          }
        });
      }
      
      if (pids.length === 0) {
        console.log('⚠️ Não foi possível identificar os PIDs dos processos.');
        resolve(false);
        return;
      }
      
      console.log(`🔴 Tentando encerrar ${pids.length} processo(s) (PIDs: ${pids.join(', ')})...`);
      
      // Tentar encerrar todos os processos
      let killedCount = 0;
      const killCommand = process.platform === 'win32' ? 'taskkill /F /PID' : 'kill -9';
      
      const killPromises = pids.map(pid => {
        return new Promise((killResolve) => {
          exec(`${killCommand} ${pid}`, (err) => {
            if (err) {
              console.error(`❌ Não foi possível encerrar o processo com PID ${pid}: ${err.message}`);
              killResolve(false);
            } else {
              console.log(`✅ Processo com PID ${pid} encerrado com sucesso.`);
              killedCount++;
              killResolve(true);
            }
          });
        });
      });
      
      // Aguardar todas as tentativas de encerramento
      Promise.all(killPromises).then(() => {
        if (killedCount > 0) {
          console.log(`✅ ${killedCount} processo(s) encerrado(s) com sucesso.`);
          
          // Esperar um pouco para garantir que os processos foram encerrados
          setTimeout(() => {
            console.log(`🔄 Verificando novamente se a porta ${port} está livre...`);
            
            exec(command, (err2, stdout2) => {
              if (!stdout2.trim()) {
                console.log(`✅ Porta ${port} está agora livre e pronta para uso.`);
                resolve(true);
              } else {
                console.log(`⚠️ Porta ${port} ainda está em uso, mesmo após tentativa de liberação.`);
                resolve(false);
              }
            });
          }, 1000); // Esperar 1 segundo
        } else {
          console.log(`⚠️ Nenhum processo foi encerrado. A porta ${port} pode ainda estar em uso.`);
          resolve(false);
        }
      });
    });
  });
};

// Iniciar o servidor
const startServer = async () => {
  // Tentar liberar a porta padrão primeiro
  const portCleared = await checkAndKillProcessOnPort(DEFAULT_PORT);
  
  if (portCleared) {
    console.log(`🚀 Porta ${DEFAULT_PORT} liberada, iniciando servidor...`);
  } else {
    console.log(`⚠️ Usando configuração alternativa de porta (o servidor tentará portas alternativas).`);
  }
  
  // Criar um arquivo .env com a variável para forçar o uso de portas alternativas
  if (!portCleared) {
    try {
      // Ler arquivo .env existente, se houver
      let envContent = '';
      try {
        envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      } catch (e) {
        // Arquivo não existe, vamos criar um novo
      }
      
      // Verificar se já existe uma configuração de FORCE_ALTERNATIVE_PORT
      const regex = /FORCE_ALTERNATIVE_PORT\s*=\s*true/;
      if (!regex.test(envContent)) {
        // Adicionar a configuração
        envContent += '\n# Configuração para forçar o uso de portas alternativas\n';
        envContent += 'FORCE_ALTERNATIVE_PORT=true\n';
        
        fs.writeFileSync(path.join(__dirname, '.env'), envContent);
        console.log('✅ Configuração para uso de portas alternativas adicionada ao arquivo .env');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar arquivo .env:', error.message);
    }
  }
  
  // Iniciar o servidor
  console.log('🚀 Iniciando o servidor Node.js...');
  
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Erro ao iniciar o servidor:', error.message);
  });
  
  process.on('SIGINT', () => {
    console.log('\n👋 Encerrando o servidor...');
    serverProcess.kill();
    process.exit(0);
  });
};

startServer(); 