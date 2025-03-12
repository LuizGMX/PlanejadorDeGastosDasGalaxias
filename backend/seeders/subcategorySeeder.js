import { Category, SubCategory } from '../models/index.js';

const subcategories = {
  'Alimentação': [
    'Mercado',
    'Restaurantes',
    'Delivery',
    'Lanches',
    'Padaria',
    'Café',
    'Bebidas',
    'Feira/Hortifruti',
    'Outros'
  ],
  'Transporte': [
    'Combustível',
    'Transporte Público',
    'Uber/99/Táxi',
    'Manutenção',
    'Estacionamento',
    'Pedágio',
    'Seguro Veicular',
    'Documentação',
    'Outros'
  ],
  'Moradia': [
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
  ],
  'Saúde': [
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
  ],
  'Educação': [
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
  ],
  'Lazer': [
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
  ],
  'Vestuário': [
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
  ],
  'Contas': [
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
  ],
  'Impostos': [
    'IR',
    'IPVA',
    'IPTU',
    'ISS',
    'Taxas Municipais',
    'Taxas Estaduais',
    'Taxas Federais',
    'Impostos Profissionais',
    'Outros'
  ],
  'Compras': [
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
  ],
  'Pets': [
    'Ração',
    'Veterinário',
    'Medicamentos',
    'Banho/Tosa',
    'Acessórios',
    'Brinquedos',
    'Petshop',
    'Vacinas',
    'Outros'
  ],
  'Cuidados Pessoais': [
    'Cabelereiro',
    'Manicure/Pedicure',
    'Produtos de Beleza',
    'Cosméticos',
    'Perfumes',
    'Spa',
    'Tratamentos Estéticos',
    'Higiene Pessoal',
    'Outros'
  ],
  'Tecnologia': [
    'Hardware',
    'Software',
    'Aplicativos',
    'Jogos',
    'Acessórios',
    'Serviços Cloud',
    'Manutenção',
    'Equipamentos',
    'Outros'
  ],
  'Outros': [
    'Presentes',
    'Doações',
    'Imprevistos',
    'Diversos',
    'Empréstimos',
    'Multas',
    'Taxas Bancárias',
    'Investimentos',
    'Outros'
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
    const categories = await Category.findAll({
      where: { type: 'expense' }
    });
    
    // Para cada categoria, cria suas subcategorias
    for (const category of categories) {
      const categorySubcategories = subcategories[category.category_name] || [];
      await Promise.all(
        categorySubcategories.map(subcategoryName =>
          SubCategory.create({
            subcategory_name: subcategoryName,
            category_id: category.id
          })
        )
      );
    }

    console.log('Subcategorias criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar subcategorias:', error);
    throw error;
  }
}; 