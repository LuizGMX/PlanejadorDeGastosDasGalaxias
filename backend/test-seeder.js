// Script simples para testar o seeder
import { sequelize } from './models/index.js';

console.log('Iniciando teste do seeder...');

// Testar conexão com o banco de dados
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
    
    // Importar e executar o seeder
    return import('./seeders/mainSeeder.js');
  })
  .then(() => {
    console.log('Seeder executado com sucesso.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro ao executar o seeder:', error);
    process.exit(1);
  }); 