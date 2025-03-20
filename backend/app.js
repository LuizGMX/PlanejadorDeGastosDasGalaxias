import express from 'express';
import cors from 'cors';
import sequelize from './config/db.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import expenseRoutes from './routes/expenses.js';
import incomeRoutes from './routes/incomes.js';
import dashboardRoutes from './routes/dashboard.js';
import bankRoutes from './routes/banks.js';
import budgetRoutes from './routes/budgets.js';
import spreadsheetRoutes from './routes/spreadsheetRoutes.js';

import userRoutes from './routes/user.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Importante: Adicionar o middleware json antes das rotas
app.use(express.json());

// Criar diretório de uploads se não existir
import { mkdirSync } from 'fs';
try {
  mkdirSync('./uploads');
} catch (err) {
  if (err.code !== 'EEXIST') {
    console.error('Erro ao criar diretório de uploads:', err);
  }
}

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/spreadsheet', spreadsheetRoutes);

app.use('/api/users', userRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo deu errado!' });
});

// Sincroniza os modelos com o banco de dados
sequelize.sync()
  .then(() => {
    console.log('Banco de dados sincronizado com sucesso!');
  })
  .catch((error) => {
    console.error('Erro ao sincronizar banco de dados:', error);
  });

export default app; 