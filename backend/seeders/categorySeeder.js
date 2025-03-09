import { Category } from '../models/index.js';

const categories = [
  {
    name: 'Alimentação',
    subcategories: [
      'Mercado',
      'Restaurantes',
      'Delivery',
      'Lanches'
    ]
  },
  {
    name: 'Transporte',
    subcategories: [
      'Combustível',
      'Transporte Público',
      'Uber/99/Táxi',
      'Manutenção',
      'Estacionamento'
    ]
  },
  {
    name: 'Moradia',
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
    name: 'Saúde',
    subcategories: [
      'Plano de Saúde',
      'Medicamentos',
      'Consultas',
      'Exames',
      'Academia'
    ]
  },
  {
    name: 'Educação',
    subcategories: [
      'Mensalidade',
      'Material Escolar',
      'Cursos',
      'Livros'
    ]
  },
  {
    name: 'Lazer',
    subcategories: [
      'Cinema/Teatro',
      'Shows',
      'Viagens',
      'Hobbies',
      'Streaming'
    ]
  },
  {
    name: 'Vestuário',
    subcategories: [
      'Roupas',
      'Calçados',
      'Acessórios',
      'Lavanderia'
    ]
  },
  {
    name: 'Contas',
    subcategories: [
      'Água',
      'Luz',
      'Internet',
      'Telefone',
      'TV por Assinatura'
    ]
  },
  {
    name: 'Impostos',
    subcategories: [
      'IR',
      'IPVA',
      'Outros Impostos'
    ]
  },
  {
    name: 'Outros',
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
          category_name: category.name
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