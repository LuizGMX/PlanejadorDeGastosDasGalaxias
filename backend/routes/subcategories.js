import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { SubCategory, Category } from '../models/index.js';

const router = express.Router();

// Listar subcategorias
router.get('/', authenticate, async (req, res) => {
  try {
    const subcategories = await SubCategory.findAll({
      include: [{
        model: Category,
        where: { user_id: req.user.id }
      }]
    });
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias:', error);
    res.status(500).json({ message: 'Erro ao listar subcategorias' });
  }
});

// Criar subcategoria
router.post('/', authenticate, async (req, res) => {
  try {
    // Verificar se a categoria pertence ao usuário
    const category = await Category.findOne({
      where: { id: req.body.category_id, user_id: req.user.id }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    const subcategory = await SubCategory.create({
      ...req.body
    });
    res.status(201).json(subcategory);
  } catch (error) {
    console.error('Erro ao criar subcategoria:', error);
    res.status(500).json({ message: 'Erro ao criar subcategoria' });
  }
});

// Atualizar subcategoria
router.put('/:id', authenticate, async (req, res) => {
  try {
    const subcategory = await SubCategory.findOne({
      include: [{
        model: Category,
        where: { user_id: req.user.id }
      }],
      where: { id: req.params.id }
    });

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategoria não encontrada' });
    }

    // Se estiver mudando a categoria, verificar se a nova categoria pertence ao usuário
    if (req.body.category_id && req.body.category_id !== subcategory.category_id) {
      const newCategory = await Category.findOne({
        where: { id: req.body.category_id, user_id: req.user.id }
      });

      if (!newCategory) {
        return res.status(404).json({ message: 'Nova categoria não encontrada' });
      }
    }

    await subcategory.update(req.body);
    res.json(subcategory);
  } catch (error) {
    console.error('Erro ao atualizar subcategoria:', error);
    res.status(500).json({ message: 'Erro ao atualizar subcategoria' });
  }
});

// Excluir subcategoria
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const subcategory = await SubCategory.findOne({
      include: [{
        model: Category,
        where: { user_id: req.user.id }
      }],
      where: { id: req.params.id }
    });

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategoria não encontrada' });
    }

    await subcategory.destroy();
    res.json({ message: 'Subcategoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir subcategoria:', error);
    res.status(500).json({ message: 'Erro ao excluir subcategoria' });
  }
});

// Listar subcategorias por categoria
router.get('/by-category/:categoryId', authenticate, async (req, res) => {
  try {
    // Verificar se a categoria pertence ao usuário
    const category = await Category.findOne({
      where: { id: req.params.categoryId, user_id: req.user.id }
    });

    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }

    const subcategories = await SubCategory.findAll({
      where: { category_id: req.params.categoryId }
    });
    res.json(subcategories);
  } catch (error) {
    console.error('Erro ao listar subcategorias por categoria:', error);
    res.status(500).json({ message: 'Erro ao listar subcategorias por categoria' });
  }
});

export default router; 