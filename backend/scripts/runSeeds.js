import seedDatabase from '../seeders/index.js';

console.log('Iniciando execução dos seeds...');

seedDatabase()
  .then(() => {
    console.log('Seeds executados com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao executar seeds:', error);
    process.exit(1);
  }); 