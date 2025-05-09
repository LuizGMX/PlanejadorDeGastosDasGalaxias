import express from 'express';
import { Budget } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Listar orçamentos do usuário
router.get('/', authenticate, async (req, res) => {
  try {
    const budgets = await Budget.findAll({
      where: { user_id: req.user.id },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });

    res.json(budgets);
  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    res.status(500).json({ message: 'Erro ao buscar orçamentos' });
  }
});

// Buscar orçamento específico
router.get('/:month/:year', authenticate, async (req, res) => {
  try {
    const { month, year } = req.params;
    const budget = await Budget.findOne({
      where: {
        user_id: req.user.id,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    if (!budget) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }

    res.json(budget);
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ message: 'Erro ao buscar orçamento' });
  }
});

// Criar ou atualizar orçamento
router.post('/', authenticate, async (req, res) => {
  try {
    const { month, year, amount } = req.body;

    const [budget, created] = await Budget.findOrCreate({
      where: {
        user_id: req.user.id,
        month: parseInt(month),
        year: parseInt(year)
      },
      defaults: {
        amount: parseFloat(amount)
      }
    });

    if (!created) {
      budget.amount = parseFloat(amount);
      await budget.save();
    }

    res.json(budget);
  } catch (error) {
    console.error('Erro ao criar/atualizar orçamento:', error);
    res.status(500).json({ message: 'Erro ao salvar orçamento' });
  }
});

// Excluir orçamento
router.delete('/:month/:year', authenticate, async (req, res) => {
  try {
    const { month, year } = req.params;
    const deleted = await Budget.destroy({
      where: {
        user_id: req.user.id,
        month: parseInt(month),
        year: parseInt(year)
      }
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Orçamento não encontrado' });
    }

    res.json({ message: 'Orçamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir orçamento:', error);
    res.status(500).json({ message: 'Erro ao excluir orçamento' });
  }
});

export default router; 