import express from 'express';
import { Category } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { literal } from 'sequelize';

const router = express.Router();

// Listar todas as categorias
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Buscando categorias...');
    const categories = await Category.findAll({
      attributes: ['id', 'category_name'],
      order: [
        [literal("category_name = 'Outros' ASC")],
        ['category_name', 'ASC']
      ]
    });
    console.log('Categorias encontradas:', categories);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

export default router; 