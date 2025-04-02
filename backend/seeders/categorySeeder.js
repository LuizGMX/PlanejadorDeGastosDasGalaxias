import { Category } from '../models/index.js';

const expenseCategories = [
  {
    category_name: 'Alimentação',
    type: 'expense'
  },
  {
    category_name: 'Moradia',
    type: 'expense'
  },
  {
    category_name: 'Transporte',
    type: 'expense'
  },
  {
    category_name: 'Saúde',
    type: 'expense'
  },
  {
    category_name: 'Educação',
    type: 'expense'
  },
  {
    category_name: 'Lazer',
    type: 'expense'
  },
  {
    category_name: 'Vestuário',
    type: 'expense'
  },
  {
    category_name: 'Higiene Pessoal',
    type: 'expense'
  },
  {
    category_name: 'Utilidades',
    type: 'expense'
  },
  {
    category_name: 'Viagens',
    type: 'expense'
  },
  {
    category_name: 'Impostos e Taxas',
    type: 'expense'
  },
  {
    category_name: 'Presentes',
    type: 'expense'
  },
  {
    category_name: 'Dívidas',
    type: 'expense'
  },
  {
    category_name: 'Outros',
    type: 'expense'
  }
];

export const seedCategories = async () => {
  try {
    // Verifica se já existem categorias
    const existingCategories = await Category.findAll();
    if (existingCategories.length > 0) {
      console.log('Categorias já existem no banco de dados.');
      return;
    }

    const createdCategories = await Promise.all(
      expenseCategories.map(category =>
        Category.create({
          category_name: category.category_name,
          type: category.type
        })
      )
    );

    console.log('Categorias criadas com sucesso!');
    return createdCategories;
  } catch (error) {
    console.error('Erro ao criar categorias:', error);
    throw error;
  }
}; 