const pidusage = require('pidusage');

async function monitorarRecursos(pid) {
  try {
    const stats = await pidusage(pid);
    console.clear(); // Limpa o console para melhor visualização
    console.log('=================================');
    console.log(`CPU: ${stats.cpu.toFixed(2)}%`);
    console.log(`RAM: ${(stats.memory / (1024 * 1024)).toFixed(2)}MB`);
    console.log('=================================');
  } catch (err) {
    console.error('Erro ao monitorar processo:', err);
    process.exit(1);
  }
}

const pid = process.argv[2];
if (!pid) {
  console.error('Por favor, forneça o PID do processo Node.js');
  console.error('Exemplo: node monitor.js PID');
  process.exit(1);
}

// Monitora a cada 1 segundo
setInterval(() => monitorarRecursos(pid), 1000);
monitorarRecursos(pid); // Executa imediatamente a primeira vez 