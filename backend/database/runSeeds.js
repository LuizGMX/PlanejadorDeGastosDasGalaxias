import { syncDatabase, testConnection } from '../config/db.js';
import seedDatabase from './seeds/index.js';

async function runSeeds() {
  try {
    console.log('🔄 Verificando conexão com o banco de dados...');
    await testConnection();
    
    console.log('🔄 Sincronizando banco de dados...');
    await syncDatabase();
    
    console.log('🌱 Iniciando execução dos seeds...');
    await seedDatabase();
    
    console.log('✅ Seeds executados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  }
}

runSeeds(); 