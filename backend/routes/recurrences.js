import express from 'express';
import { authenticate } from '../middleware/auth.js';
import RecurrenceRule from '../models/recurrenceRule.js';
import { calculateOccurrences } from '../utils/recurrenceCalculator.js';
import Category from '../models/category.js';
import Bank from '../models/bank.js';

const router = express.Router();

// Criar uma nova regra de recorrência
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      source_type,
      source_id,
      frequency_type,
      start_date,
      end_date,
      day_of_month,
      amount,
      description,
      category_id,
      bank_id,
      payment_method
    } = req.body;

    const rule = await RecurrenceRule.create({
      source_type,
      source_id,
      frequency_type,
      start_date,
      end_date,
      day_of_month,
      amount,
      description,
      category_id,
      bank_id,
      payment_method,
      user_id: req.user.id
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error('Erro ao criar regra de recorrência:', error);
    res.status(500).json({ message: 'Erro ao criar regra de recorrência' });
  }
});

// Listar regras de recorrência do usuário
router.get('/', authenticate, async (req, res) => {
  try {
    const rules = await RecurrenceRule.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Category, as: 'Category' },
        { model: Bank, as: 'bank' },
        { model: RecurrenceException, as: 'exceptions' }
      ]
    });

    res.json(rules);
  } catch (error) {
    console.error('Erro ao listar regras de recorrência:', error);
    res.status(500).json({ message: 'Erro ao listar regras de recorrência' });
  }
});

// Atualizar uma regra de recorrência
router.put('/:id', authenticate, async (req, res) => {
  try {
    const rule = await RecurrenceRule.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!rule) {
      return res.status(404).json({ message: 'Regra de recorrência não encontrada' });
    }

    await rule.update(req.body);
    res.json(rule);
  } catch (error) {
    console.error('Erro ao atualizar regra de recorrência:', error);
    res.status(500).json({ message: 'Erro ao atualizar regra de recorrência' });
  }
});

// Excluir uma regra de recorrência
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const rule = await RecurrenceRule.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!rule) {
      return res.status(404).json({ message: 'Regra de recorrência não encontrada' });
    }

    await rule.destroy();
    res.json({ message: 'Regra de recorrência excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir regra de recorrência:', error);
    res.status(500).json({ message: 'Erro ao excluir regra de recorrência' });
  }
});

// Calcular ocorrências em um período
router.get('/:id/occurrences', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'Datas inicial e final são obrigatórias' });
    }

    const rule = await RecurrenceRule.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [RecurrenceException]
    });

    if (!rule) {
      return res.status(404).json({ message: 'Regra de recorrência não encontrada' });
    }

    const occurrences = calculateOccurrences(
      rule,
      new Date(start_date),
      new Date(end_date),
      rule.RecurrenceExceptions
    );

    res.json(occurrences);
  } catch (error) {
    console.error('Erro ao calcular ocorrências:', error);
    res.status(500).json({ message: 'Erro ao calcular ocorrências' });
  }
});

export default router; 