import express from 'express';
import { Category, SubCategory } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Listar todas as categorias
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Buscando categorias...');
    const categories = await Category.findAll({
      attributes: ['id', 'category_name'],
      order: [['category_name', 'ASC']]
    });
    console.log('Categorias encontradas:', categories);
    res.json(categories);
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ message: 'Erro ao buscar categorias' });
  }
});

// Buscar subcategorias por categoria
router.get('/:categoryId/subcategories', authenticate, async (req, res) => {
  try {
    console.log('Buscando subcategorias para categoria:', req.params.categoryId);
    const subcategories = await SubCategory.findAll({
      where: { category_id: req.params.categoryId },
      attributes: ['id', 'subcategory_name'],
      order: [['subcategory_name', 'ASC']]
    });
    console.log('Subcategorias encontradas:', subcategories);
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao buscar subcategorias' });
  }
});

export default router; 