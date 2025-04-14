// Sincroniza o banco de dados
import sequelize from '../config/db.js';

async function syncDatabase() {
  try {
    console.log('Iniciando sincronização do banco de dados...');
    
    // Sincroniza as tabelas com o banco de dados
    // force: false para não dropar as tabelas existentes
    await sequelize.sync({ force: false, alter: true });
    
    console.log('Banco de dados sincronizado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao sincronizar o banco de dados:', error);
    process.exit(1);
  }
}

syncDatabase(); 