import { Category } from '../models/index.js';

const categories = [
  {
    category_name: 'Alimentação',
    subcategories: [
      'Mercado',
      'Restaurantes',
      'Delivery',
      'Lanches'
    ]
  },
  {
    category_name: 'Transporte',
    subcategories: [
      'Combustível',
      'Transporte Público',
      'Uber/99/Táxi',
      'Manutenção',
      'Estacionamento'
    ]
  },
  {
    category_name: 'Moradia',
    subcategories: [
      'Aluguel',
      'Condomínio',
      'IPTU',
      'Manutenção',
      'Mobília',
      'Decoração'
    ]
  },
  {
    category_name: 'Saúde',
    subcategories: [
      'Plano de Saúde',
      'Medicamentos',
      'Consultas',
      'Exames',
      'Academia'
    ]
  },
  {
    category_name: 'Educação',
    subcategories: [
      'Mensalidade',
      'Material Escolar',
      'Cursos',
      'Livros'
    ]
  },
  {
    category_name: 'Lazer',
    subcategories: [
      'Cinema/Teatro',
      'Shows',
      'Viagens',
      'Hobbies',
      'Streaming'
    ]
  },
  {
    category_name: 'Vestuário',
    subcategories: [
      'Roupas',
      'Calçados',
      'Acessórios',
      'Lavanderia'
    ]
  },
  {
    category_name: 'Contas',
    subcategories: [
      'Água',
      'Luz',
      'Internet',
      'Telefone',
      'TV por Assinatura'
    ]
  },
  {
    category_name: 'Impostos',
    subcategories: [
      'IR',
      'IPVA',
      'Outros Impostos'
    ]
  },
  {
    category_name: 'Outros',
    subcategories: [
      'Presentes',
      'Doações',
      'Imprevistos',
      'Diversos'
    ]
  }
];

export const seedCategories = async () => {
  try {
    const createdCategories = await Promise.all(
      categories.map(category =>
        Category.create({
          category_name: category.category_name,
          type: 'expense'
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