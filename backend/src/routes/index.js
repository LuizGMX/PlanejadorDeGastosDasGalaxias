const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./users');
const bankRoutes = require('./bank');
const categoryRoutes = require('./categories');
const subcategoryRoutes = require('./subcategories');
const expenseRoutes = require('./expenses');
const incomeRoutes = require('./incomes');
const dashboardRoutes = require('./dashboard');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/bank', bankRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/expenses', expenseRoutes);
router.use('/incomes', incomeRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router; 