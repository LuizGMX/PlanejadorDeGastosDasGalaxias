/**
 * Script para verificar e encerrar processos que estão usando a porta 5000
 * Use com: node killPort.js
 */

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PORT = 5000;

console.log(`🔍 Verificando processos que estão usando a porta ${PORT}...`);

if (process.platform === 'win32') {
  // Windows
  exec(`netstat -ano | findstr :${PORT}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Erro ao executar o comando: ${error.message}`);
      rl.close();
      return;
    }
    
    if (stderr) {
      console.error(`❌ Erro de comando: ${stderr}`);
      rl.close();
      return;
    }
    
    if (!stdout.trim()) {
      console.log(`✅ Nenhum processo encontrado usando a porta ${PORT}.`);
      rl.close();
      return;
    }
    
    console.log('Processos encontrados:');
    console.log(stdout);
    
    // Extrair os PIDs dos processos
    const lines = stdout.split('\n').filter(line => line.trim() !== '');
    const pids = [];
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[4];
        if (!pids.includes(pid) && pid !== '0') {
          pids.push(pid);
        }
      }
    });
    
    if (pids.length === 0) {
      console.log('⚠️ Não foi possível identificar os PIDs dos processos.');
      rl.close();
      return;
    }
    
    console.log(`\nPIDs encontrados: ${pids.join(', ')}`);
    
    rl.question('\n⚠️ Deseja encerrar esses processos? (s/N): ', (answer) => {
      if (answer.toLowerCase() === 's') {
        pids.forEach(pid => {
          console.log(`🔴 Encerrando processo com PID ${pid}...`);
          exec(`taskkill /F /PID ${pid}`, (err, out, stdErr) => {
            if (err) {
              console.error(`❌ Erro ao encerrar processo ${pid}: ${err.message}`);
            } else {
              console.log(`✅ Processo ${pid} encerrado com sucesso.`);
            }
          });
        });
      } else {
        console.log('Operação cancelada pelo usuário.');
      }
      rl.close();
    });
  });
} else {
  // Linux ou macOS
  exec(`lsof -i :${PORT}`, (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      console.error(`❌ Erro ao executar o comando: ${error.message}`);
      rl.close();
      return;
    }
    
    if (stderr) {
      console.error(`❌ Erro de comando: ${stderr}`);
      rl.close();
      return;
    }
    
    if (!stdout.trim()) {
      console.log(`✅ Nenhum processo encontrado usando a porta ${PORT}.`);
      rl.close();
      return;
    }
    
    console.log('Processos encontrados:');
    console.log(stdout);
    
    // Extrair os PIDs dos processos
    const lines = stdout.split('\n').filter(line => line.trim() !== '');
    lines.shift(); // Remover cabeçalho
    
    const pids = [];
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const pid = parts[1];
        if (!pids.includes(pid)) {
          pids.push(pid);
        }
      }
    });
    
    if (pids.length === 0) {
      console.log('⚠️ Não foi possível identificar os PIDs dos processos.');
      rl.close();
      return;
    }
    
    console.log(`\nPIDs encontrados: ${pids.join(', ')}`);
    
    rl.question('\n⚠️ Deseja encerrar esses processos? (s/N): ', (answer) => {
      if (answer.toLowerCase() === 's') {
        pids.forEach(pid => {
          console.log(`🔴 Encerrando processo com PID ${pid}...`);
          exec(`kill -9 ${pid}`, (err, out, stdErr) => {
            if (err) {
              console.error(`❌ Erro ao encerrar processo ${pid}: ${err.message}`);
            } else {
              console.log(`✅ Processo ${pid} encerrado com sucesso.`);
            }
          });
        });
      } else {
        console.log('Operação cancelada pelo usuário.');
      }
      rl.close();
    });
  });
} 