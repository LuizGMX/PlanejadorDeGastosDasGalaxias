import { Router } from 'express';
import authRoutes from './auth.js';
import categoryRoutes from './categories.js';
import expenseRoutes from './expenses.js';
import incomeRoutes from './incomes.js';
import dashboardRoutes from './dashboard.js';
import bankRoutes from './banks.js';
import budgetRoutes from './budgets.js';
import spreadsheetRoutes from './spreadsheetRoutes.js';
import userRoutes from './users.js';
import recurrencesRouter from './recurrences.js';
import telegramRoutes from './telegramRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/incomes', incomeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/banks', bankRoutes);
router.use('/budgets', budgetRoutes);
router.use('/spreadsheet', spreadsheetRoutes);
router.use('/users', userRoutes);
router.use('/recurrences', recurrencesRouter);
router.use('/telegram', telegramRoutes);

export default router; 