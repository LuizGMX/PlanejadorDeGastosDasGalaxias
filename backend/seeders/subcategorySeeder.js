import { Category, SubCategory } from '../models/index.js';

const subcategories = {
  'Alimentação': [
    'Mercado',
    'Restaurantes',
    'Delivery',
    'Lanches',
    'Outros'
  ],
  'Transporte': [
    'Combustível',
    'Transporte Público',
    'Uber/99/Táxi',
    'Manutenção',
    'Estacionamento',
    'Outros'
  ],
  'Moradia': [
    'Aluguel',
    'Condomínio',
    'IPTU',
    'Manutenção',
    'Mobília',
    'Decoração',
    'Outros'
  ],
  'Saúde': [
    'Plano de Saúde',
    'Medicamentos',
    'Consultas',
    'Exames',
    'Academia',
    'Outros'
  ],
  'Educação': [
    'Mensalidade',
    'Material Escolar',
    'Cursos',
    'Livros',
    'Outros'
  ],
  'Lazer': [
    'Cinema/Teatro',
    'Shows',
    'Viagens',
    'Hobbies',
    'Streaming',
    'Outros'
  ],
  'Vestuário': [
    'Roupas',
    'Calçados',
    'Acessórios',
    'Lavanderia',
    'Outros'
  ],
  'Contas': [
    'Água',
    'Luz',
    'Internet',
    'Telefone',
    'TV por Assinatura',
    'Outros'
  ],
  'Impostos': [
    'IR',
    'IPVA',
    'Outros Impostos'
  ],
  'Outros': [
    'Presentes',
    'Doações',
    'Imprevistos',
    'Diversos'
  ]
};

export const seedSubCategories = async () => {
  try {
    // Verifica se já existem subcategorias
    const existingSubCategories = await SubCategory.findAll();
    if (existingSubCategories.length > 0) {
      console.log('Subcategorias já existem no banco de dados.');
      return;
    }

    // Busca todas as categorias
    const categories = await Category.findAll();
    
    // Para cada categoria, cria suas subcategorias
    for (const category of categories) {
      const categorySubcategories = subcategories[category.category_name];
      if (categorySubcategories) {
        await Promise.all(
          categorySubcategories.map(subcategoryName =>
            SubCategory.create({
              subcategory_name: subcategoryName,
              category_id: category.id
            })
          )
        );
      }
    }

    console.log('Subcategorias criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar subcategorias:', error);
    throw error;
  }
}; 