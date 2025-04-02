import { Sequelize, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

// Configurar o dotenv para carregar as variáveis de ambiente
dotenv.config();

// Criar uma instância do Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'planejador',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function runMigration() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Iniciando migração para remover subcategorias');

    // 1. Verificar e remover a coluna subcategory_id da tabela expenses
    const hasSubcategoryInExpenses = await sequelize.query(
      `SHOW COLUMNS FROM expenses LIKE 'subcategory_id'`,
      { type: QueryTypes.SELECT, transaction }
    );

    if (hasSubcategoryInExpenses.length > 0) {
      console.log('Removendo coluna subcategory_id da tabela expenses');
      await sequelize.query(
        `ALTER TABLE expenses DROP COLUMN subcategory_id`,
        { transaction }
      );
    }

    // 2. Verificar e remover a coluna subcategory_id da tabela incomes
    const hasSubcategoryInIncomes = await sequelize.query(
      `SHOW COLUMNS FROM incomes LIKE 'subcategory_id'`,
      { type: QueryTypes.SELECT, transaction }
    );

    if (hasSubcategoryInIncomes.length > 0) {
      console.log('Removendo coluna subcategory_id da tabela incomes');
      await sequelize.query(
        `ALTER TABLE incomes DROP COLUMN subcategory_id`,
        { transaction }
      );
    }

    // 3. Verificar e remover a coluna subcategory_id da tabela recurrence_rules
    const hasSubcategoryInRecurrence = await sequelize.query(
      `SHOW COLUMNS FROM recurrence_rules LIKE 'subcategory_id'`,
      { type: QueryTypes.SELECT, transaction }
    );

    if (hasSubcategoryInRecurrence.length > 0) {
      console.log('Removendo coluna subcategory_id da tabela recurrence_rules');
      await sequelize.query(
        `ALTER TABLE recurrence_rules DROP COLUMN subcategory_id`,
        { transaction }
      );
    }

    // 4. Verificar e remover a tabela subcategories
    const hasSubcategoriesTable = await sequelize.query(
      `SHOW TABLES LIKE 'subcategories'`,
      { type: QueryTypes.SELECT, transaction }
    );

    if (hasSubcategoriesTable.length > 0) {
      console.log('Removendo tabela subcategories');
      await sequelize.query(
        `DROP TABLE subcategories`,
        { transaction }
      );
    }

    await transaction.commit();
    console.log('Migração concluída com sucesso');
  } catch (error) {
    await transaction.rollback();
    console.error('Erro durante a migração:', error);
    throw error;
  } finally {
    // Fechar a conexão com o banco de dados
    await sequelize.close();
  }
}

// Executa a migração
runMigration()
  .then(() => {
    console.log('Migração executada com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  }); 