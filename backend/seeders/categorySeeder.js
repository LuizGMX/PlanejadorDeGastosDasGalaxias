import { Category } from '../models/index.js';

const categories = [
  {
    category_name: 'Alimentação',
    subcategories: [
      'Mercado',
      'Restaurantes',
      'Delivery',
      'Lanches',
      'Padaria',
      'Café',
      'Bebidas',
      'Feira/Hortifruti',
      'Outros'
    ]
  },
  {
    category_name: 'Transporte',
    subcategories: [
      'Combustível',
      'Transporte Público',
      'Uber/99/Táxi',
      'Manutenção',
      'Estacionamento',
      'Pedágio',
      'Seguro Veicular',
      'Documentação',
      'Outros'
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
      'Decoração',
      'Eletrodomésticos',
      'Reforma',
      'Seguro Residencial',
      'Material de Limpeza',
      'Outros'
    ]
  },
  {
    category_name: 'Saúde',
    subcategories: [
      'Plano de Saúde',
      'Medicamentos',
      'Consultas',
      'Exames',
      'Academia',
      'Dentista',
      'Terapia',
      'Suplementos',
      'Farmácia',
      'Vacinas',
      'Outros'
    ]
  },
  {
    category_name: 'Educação',
    subcategories: [
      'Mensalidade',
      'Material Escolar',
      'Cursos',
      'Livros',
      'Idiomas',
      'Pós-graduação',
      'Certificações',
      'Workshops',
      'Material Didático',
      'Equipamentos',
      'Outros'
    ]
  },
  {
    category_name: 'Lazer',
    subcategories: [
      'Cinema/Teatro',
      'Shows',
      'Viagens',
      'Hobbies',
      'Streaming',
      'Jogos',
      'Esportes',
      'Bares',
      'Festas',
      'Parques',
      'Música',
      'Assinaturas',
      'Outros'
    ]
  },
  {
    category_name: 'Vestuário',
    subcategories: [
      'Roupas',
      'Calçados',
      'Acessórios',
      'Lavanderia',
      'Roupas Íntimas',
      'Roupas Esportivas',
      'Roupas Sociais',
      'Bolsas/Carteiras',
      'Joias/Bijuterias',
      'Outros'
    ]
  },
  {
    category_name: 'Contas',
    subcategories: [
      'Água',
      'Luz',
      'Internet',
      'Telefone',
      'TV por Assinatura',
      'Gás',
      'Celular',
      'Streaming',
      'Assinaturas Digitais',
      'Seguros',
      'Outros'
    ]
  },
  {
    category_name: 'Impostos',
    subcategories: [
      'IR',
      'IPVA',
      'IPTU',
      'ISS',
      'Taxas Municipais',
      'Taxas Estaduais',
      'Taxas Federais',
      'Impostos Profissionais',
      'Outros'
    ]
  },
  {
    category_name: 'Compras',
    subcategories: [
      'Eletrônicos',
      'Informática',
      'Celulares',
      'Eletrodomésticos',
      'Móveis',
      'Decoração',
      'Presentes',
      'Papelaria',
      'Cosméticos',
      'Ferramentas',
      'Outros'
    ]
  },
  {
    category_name: 'Pets',
    subcategories: [
      'Ração',
      'Veterinário',
      'Medicamentos',
      'Banho/Tosa',
      'Acessórios',
      'Brinquedos',
      'Petshop',
      'Vacinas',
      'Outros'
    ]
  },
  {
    category_name: 'Cuidados Pessoais',
    subcategories: [
      'Cabelereiro',
      'Manicure/Pedicure',
      'Produtos de Beleza',
      'Cosméticos',
      'Perfumes',
      'Spa',
      'Tratamentos Estéticos',
      'Higiene Pessoal',
      'Outros'
    ]
  },
  {
    category_name: 'Tecnologia',
    subcategories: [
      'Hardware',
      'Software',
      'Aplicativos',
      'Jogos',
      'Acessórios',
      'Serviços Cloud',
      'Manutenção',
      'Equipamentos',
      'Outros'
    ]
  },
  {
    category_name: 'Outros',
    subcategories: [
      'Presentes',
      'Doações',
      'Imprevistos',
      'Empréstimos',
      'Multas',
      'Taxas Bancárias',
      'Investimentos',
      'Diversos',
      'Outros'
    ]
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