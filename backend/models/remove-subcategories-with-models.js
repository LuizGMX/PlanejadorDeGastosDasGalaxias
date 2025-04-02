import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Configurar variáveis de ambiente
dotenv.config();

// Função principal de migração que pode ser importada e executada
async function runMigration(existingSequelize = null) {
  try {
    // Usar o sequelize fornecido ou criar uma nova conexão
    const sequelize = existingSequelize || new Sequelize(
      process.env.DB_NAME || 'planejador',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || 'root',
      {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
      }
    );

    // Flag para saber se criamos uma nova conexão que precisa ser fechada
    const shouldCloseConnection = !existingSequelize;
    let transaction;

    try {
      // Teste a conexão primeiro
      await sequelize.authenticate();
      console.log('Conexão com banco de dados estabelecida para migração.');
      
      transaction = await sequelize.transaction();
      console.log('Iniciando migração para remover subcategorias');

      // Verificar tabelas diretamente
      const tables = ['expenses', 'incomes', 'recurrence_rules'];
      
      for (const table of tables) {
        try {
          // Verifica se a tabela existe primeiro
          const tableExists = await sequelize.getQueryInterface().showAllTables()
            .then(tables => tables.includes(table));
            
          if (!tableExists) {
            console.log(`Tabela ${table} não existe no banco de dados`);
            continue;
          }
          
          // Verifica se a coluna existe 
          const columns = await sequelize.getQueryInterface().describeTable(table)
            .then(columns => Object.keys(columns).includes('subcategory_id'))
            .catch(() => false);
          
          if (columns) {
            console.log(`Removendo coluna subcategory_id da tabela ${table}`);
            await sequelize.query(
              `ALTER TABLE ${table} DROP COLUMN subcategory_id`,
              { transaction }
            );
            console.log(`Coluna subcategory_id removida da tabela ${table}`);
          } else {
            console.log(`Tabela ${table} não possui coluna subcategory_id`);
          }
        } catch (error) {
          console.log(`Erro ao verificar/remover coluna subcategory_id da tabela ${table}:`, error.message);
          // Continuamos para a próxima tabela
        }
      }

      try {
        // Verifica se a tabela subcategories existe
        const tableExists = await sequelize.getQueryInterface().showAllTables()
          .then(tables => tables.includes('subcategories'));
        
        if (tableExists) {
          console.log('Removendo a tabela subcategories');
          await sequelize.query(
            'DROP TABLE subcategories',
            { transaction }
          );
          console.log('Tabela subcategories removida com sucesso');
        } else {
          console.log('Tabela subcategories não existe');
        }
      } catch (error) {
        console.log('Erro ao remover tabela subcategories:', error.message);
      }

      await transaction.commit();
      console.log('Migração concluída com sucesso');
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error('Erro durante a migração:', error);
      throw error;
    } finally {
      // Encerrar a conexão com o banco de dados apenas se criamos uma nova
      if (shouldCloseConnection) {
        await sequelize.close();
      }
    }
  } catch (error) {
    console.error('Erro fatal na migração:', error);
    throw error;
  }
}

// Executar a migração se este arquivo for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('Migração executada com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar migração:', error);
      process.exit(1);
    });
}

// Exportar a função para ser usada em outros arquivos
export default runMigration; 