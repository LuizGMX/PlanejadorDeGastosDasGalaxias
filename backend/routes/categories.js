import express from 'express';
import { Category, SubCategory } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { literal } from 'sequelize';

const router = express.Router();

// Listar todas as categorias
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('Buscando categorias...');
    const categories = await Category.findAll({
      attributes: ['id', 'category_name'],
      include: [{
        model: SubCategory,
        attributes: ['id', 'subcategory_name']
      }],
      order: [
        [literal("category_name = 'Outros' ASC")],
        ['category_name', 'ASC'],
        [SubCategory, literal("subcategory_name = 'Outros' ASC")],
        [SubCategory, 'subcategory_name', 'ASC']
      ]
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
    
    // Verifica se a categoria existe
    const category = await Category.findByPk(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    const subcategories = await SubCategory.findAll({
      where: { category_id: req.params.categoryId },
      attributes: ['id', 'subcategory_name'],
      include: [{
        model: Category,
        attributes: ['category_name']
      }],
      order: [
        [literal("subcategory_name = 'Outros' ASC")],
        ['subcategory_name', 'ASC']
      ]
    });

    console.log('Subcategorias encontradas:', subcategories);
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao buscar subcategorias' });
  }
});

router.get('/subcategories/:categoryId', authenticate, async (req, res) => {
  try {
    const category = await Category.findOne({
      where: { 
        id: req.params.categoryId,
        type: 'expense'
      }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    const subcategories = await SubCategory.findAll({
      where: { category_id: req.params.categoryId },
      attributes: ['id', 'subcategory_name'],
      order: [
        [literal("subcategory_name = 'Outros' ASC")],
        ['subcategory_name', 'ASC']
      ]
    });
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao buscar subcategorias' });
  }
});

export default router; 