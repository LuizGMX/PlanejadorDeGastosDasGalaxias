import { sequelize } from '../models/index.js';
import seedDatabase from './index.js';

// Função principal para executar todos os seeders
async function runAllSeeders() {
  try {
    console.log('Iniciando processo de seeding...');
    
    // Testar conexão com o banco de dados
    console.log('Testando conexão com o banco de dados...');
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Sincronizar todos os modelos
    console.log('Iniciando sincronização do banco de dados...');
    await sequelize.sync({ force: false });
    console.log('Banco de dados sincronizado com sucesso.');

    // Executar todos os seeders
    await seedDatabase();
    console.log('Todos os seeders concluídos com sucesso!');
  } catch (error) {
    console.error('Erro durante o processo de seeding:', error);
    throw error;
  } finally {
    // Fechar conexão com o banco de dados
    await sequelize.close();
    console.log('Conexão com o banco de dados fechada.');
  }
}

// Executar o seeder
console.log('Iniciando script de seeding...');
runAllSeeders()
  .then(() => {
    console.log('Processo de seeding concluído com sucesso.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Falha no processo de seeding:', error);
    process.exit(1);
  }); 