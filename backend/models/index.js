// models/index.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import defineUserModel from './user.js';
import defineCategoryModel from './category.js';
import defineExpenseModel from './expense.js';
import defineIncomeModel from './income.js';
import defineBankModel from './bank.js';
import defineBudgetModel from './budget.js';
import defineVerificationCodeModel from './verificationCode.js';
import defineUserBankModel from './userBank.js';
import defineRecurrenceRuleModel from './recurrenceRule.js';
import defineExpensesRecurrenceExceptionModel from './expensesRecurrenceException.js';
import defineIncomesRecurrenceExceptionModel from './incomesRecurrenceException.js';
import definePaymentModel from './payment.js';
import defineFinancialGoalModel from './financialGoal.js';
import AuditLog from './auditLog.js';

// Configurações do banco de dados
dotenv.config();

// Configurações de ambiente
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(`Ambiente: ${isDevelopment ? 'Desenvolvimento' : 'Produção'}`);

// Conectar ao banco de dados com timeout e retry
const connectWithRetry = async (config, retries = 5) => {
  console.log('Tentando conectar ao banco de dados...');
  console.log(`Configuração: ${config.host}:${config.port || 3306}/${config.database}`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const seq = new Sequelize(
        config.database,
        config.username,
        config.password,
        {
          host: config.host,
          port: config.port || 3306,
          dialect: 'mysql',
          logging: isDevelopment,
          dialectOptions: {
            connectTimeout: 10000, // 10 segundos
          },
          pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
          },
          define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            timestamps: true
          }
        }
      );

      // Testar a conexão
      await seq.authenticate();
      console.log('✅ Conexão com banco de dados estabelecida com sucesso!');
      return seq;
    } catch (error) {
      console.error(`❌ Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt === retries) {
        console.error('Não foi possível conectar ao banco de dados após várias tentativas.');
        if (isDevelopment) {
          console.log('🔧 Em ambiente de desenvolvimento, criando instância simulada do banco');
          
          // Mock do Sequelize para ambiente de desenvolvimento quando não conseguir conectar
          const mockSequelize = new Sequelize('sqlite::memory:');
          return mockSequelize;
        }
        throw error;
      }
      
      // Esperar antes de tentar novamente
      const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
      console.log(`Aguardando ${delay/1000} segundos antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Configuração do banco de dados
const dbConfig = {
  database: process.env.DB_NAME || 'planejador',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306
};

// Inicialmente, criar uma conexão simples
let sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true
    }
  }
);

// Flag para indicar se estamos usando uma conexão simulada
let usingMockDatabase = false;

// Função para inicializar a conexão de forma segura
const initializeConnection = async () => {
  try {
    // Tentar conectar
    await sequelize.authenticate({timeout: 5000});
    console.log('Conexão ao banco de dados bem-sucedida!');
  } catch (error) {
    console.error('Erro na conexão inicial ao banco de dados:', error.message);
    console.log('Tentando reconectar com estratégia de retry...');
    
    try {
      // Tentar novamente com retry
      sequelize = await connectWithRetry(dbConfig);
    } catch (retryError) {
      console.error('Falha na reconexão:', retryError.message);
      
      if (isDevelopment) {
        console.log('⚠️ Usando SQLite em memória para desenvolvimento');
        sequelize = new Sequelize('sqlite::memory:', {
          logging: false
        });
        usingMockDatabase = true;
      } else {
        throw retryError;
      }
    }
  }
  
  return sequelize;
};

// Chamada inicializar (mas não espera pela promessa)
initializeConnection().catch(err => {
  console.error('Falha fatal na inicialização do banco:', err);
  process.exit(1);
});

// Definição dos modelos
const User = defineUserModel(sequelize);
const Category = defineCategoryModel(sequelize);
const Expense = defineExpenseModel(sequelize);
const Income = defineIncomeModel(sequelize);
const Bank = defineBankModel(sequelize);
const Budget = defineBudgetModel(sequelize);
const VerificationCode = defineVerificationCodeModel(sequelize);
const UserBank = defineUserBankModel(sequelize);
const RecurrenceRule = defineRecurrenceRuleModel(sequelize);
const ExpensesRecurrenceException = defineExpensesRecurrenceExceptionModel(sequelize);
const IncomesRecurrenceException = defineIncomesRecurrenceExceptionModel(sequelize);
const Payment = definePaymentModel(sequelize);
const FinancialGoal = defineFinancialGoalModel(sequelize);

// Associações entre modelos
// User-Expense
User.hasMany(Expense, {
  foreignKey: 'user_id',
  as: 'expenses'
});
Expense.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Income
User.hasMany(Income, {
  foreignKey: 'user_id',
  as: 'incomes'
});
Income.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Category
User.hasMany(Category, {
  foreignKey: 'user_id',
  as: 'categories'
});
Category.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-Budget
User.hasMany(Budget, {
  foreignKey: 'user_id',
  as: 'budgets'
});
Budget.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-VerificationCode
User.hasMany(VerificationCode, {
  foreignKey: 'user_id',
  as: 'verificationCodes'
});
VerificationCode.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Category-Expense
Category.hasMany(Expense, {
  foreignKey: 'category_id',
  as: 'expenses'
});
Expense.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Income
Category.hasMany(Income, {
  foreignKey: 'category_id',
  as: 'incomes'
});
Income.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// Category-Budget
Category.hasMany(Budget, {
  foreignKey: 'category_id',
  as: 'budgets'
});
Budget.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'category'
});

// Bank-Expense
Bank.hasMany(Expense, {
  foreignKey: 'bank_id',
  as: 'expenses'
});
Expense.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// Bank-Income
Bank.hasMany(Income, {
  foreignKey: 'bank_id',
  as: 'incomes'
});
Income.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Bank (Many-to-Many)
User.belongsToMany(Bank, {
  through: UserBank,
  foreignKey: 'user_id',
  otherKey: 'bank_id',
  as: 'banks'
});
Bank.belongsToMany(User, {
  through: UserBank,
  foreignKey: 'bank_id',
  otherKey: 'user_id',
  as: 'users'
});

// Associações adicionais para UserBank
UserBank.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});
UserBank.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-RecurrenceRule
User.hasMany(RecurrenceRule, {
  foreignKey: 'user_id',
  as: 'recurrenceRules'
});
RecurrenceRule.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// RecurrenceRule-Category
Category.hasMany(RecurrenceRule, {
  foreignKey: 'category_id',
  as: 'recurrenceRules'
});
RecurrenceRule.belongsTo(Category, {
  foreignKey: 'category_id',
  as: 'Category'
});

// RecurrenceRule-Bank
Bank.hasMany(RecurrenceRule, {
  foreignKey: 'bank_id',
  as: 'recurrenceRules'
});
RecurrenceRule.belongsTo(Bank, {
  foreignKey: 'bank_id',
  as: 'bank'
});

// User-Payment
User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments'
});
Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Expense-ExpensesRecurrenceException
Expense.hasMany(ExpensesRecurrenceException, {
  foreignKey: 'expense_id',
  as: 'exceptions'
});
ExpensesRecurrenceException.belongsTo(Expense, {
  foreignKey: 'expense_id',
  as: 'expense'
});

// User-ExpensesRecurrenceException
User.hasMany(ExpensesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'expenseExceptions'
});
ExpensesRecurrenceException.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Income-IncomesRecurrenceException
Income.hasMany(IncomesRecurrenceException, {
  foreignKey: 'income_id',
  as: 'exceptions'
});
IncomesRecurrenceException.belongsTo(Income, {
  foreignKey: 'income_id',
  as: 'income'
});

// User-IncomesRecurrenceException
User.hasMany(IncomesRecurrenceException, {
  foreignKey: 'user_id',
  as: 'incomeExceptions'
});
IncomesRecurrenceException.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User-FinancialGoal
User.hasOne(FinancialGoal, {
  foreignKey: 'user_id',
  as: 'financial_goal'
});
FinancialGoal.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

const models = {
  User,
  Category,
  Bank,
  Expense,
  Income,
  Budget,
  VerificationCode,
  UserBank,
  RecurrenceRule,
  ExpensesRecurrenceException,
  IncomesRecurrenceException,
  Payment,
  FinancialGoal,
  AuditLog
};

// Exporta os modelos e a instância do Sequelize
export {
  sequelize,
  models
};