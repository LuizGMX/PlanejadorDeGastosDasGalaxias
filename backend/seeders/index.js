import { Bank, Category, SubCategory } from '../models/index.js';
import { seedCategories } from './categorySeeder.js';
import { seedSubCategories } from './subcategorySeeder.js';
import { seedUserAndExpenses } from './userAndExpensesSeeder.js';
import { seedUserAndIncomes } from './userAndIncomesSeeder.js';

const banks = [
  { name: 'Banco do Brasil', code: '001' },
  { name: 'Bradesco', code: '237' },
  { name: 'Caixa Econômica Federal', code: '104' },
  { name: 'Itaú', code: '341' },
  { name: 'Santander', code: '033' },
  { name: 'Nubank', code: '260' },
  { name: 'Inter', code: '077' },
  { name: 'C6 Bank', code: '336' },
  { name: 'Next', code: '237' },
  { name: 'PicPay', code: '380' }
];

const incomeCategories = [
  {
    category_name: 'Salário',
    subcategories: [
      'CLT',
      'PJ',
      'Férias',
      '13º Salário',
      'Hora Extra',
      'Bônus',
      'PLR',
      'Outros'
    ]
  },
  {
    category_name: 'Freelance',
    subcategories: [
      'Desenvolvimento',
      'Design',
      'Consultoria',
      'Marketing Digital',
      'Redação',
      'Tradução',
      'Aulas Particulares',
      'Outros'
    ]
  },
  {
    category_name: 'Investimentos',
    subcategories: [
      'Ações',
      'FIIs',
      'Renda Fixa',
      'CDB',
      'Tesouro Direto',
      'Dividendos',
      'Fundos',
      'Criptomoedas',
      'Poupança',
      'Outros'
    ]
  },
  {
    category_name: 'Aluguel',
    subcategories: [
      'Imóvel Residencial',
      'Imóvel Comercial',
      'Temporada',
      'Garagem/Estacionamento',
      'Outros'
    ]
  },
  {
    category_name: 'Vendas',
    subcategories: [
      'Produtos Físicos',
      'Produtos Digitais',
      'Serviços',
      'Comissões',
      'Marketplace',
      'Dropshipping',
      'Outros'
    ]
  },
  {
    category_name: 'Rendimentos',
    subcategories: [
      'Juros',
      'Royalties',
      'Direitos Autorais',
      'Patentes',
      'Outros'
    ]
  },
  {
    category_name: 'Negócio Próprio',
    subcategories: [
      'Lucro',
      'Pró-labore',
      'Distribuição de Lucros',
      'Outros'
    ]
  },
  {
    category_name: 'Benefícios',
    subcategories: [
      'Vale Refeição',
      'Vale Alimentação',
      'Vale Transporte',
      'Auxílio Home Office',
      'Outros'
    ]
  },
  {
    category_name: 'Outros',
    subcategories: [
      'Presentes',
      'Prêmios',
      'Heranças',
      'Reembolsos',
      'Empréstimos',
      'Doações',
      'Diversos'
    ]
  }
];

const seedBanks = async () => {
  try {
    // Verifica se já existem bancos
    const existingBanks = await Bank.findAll();
    if (existingBanks.length === 0) {
      await Bank.bulkCreate(banks);
      console.log('Bancos criados com sucesso!');
    } else {
      console.log('Bancos já existem no banco de dados.');
    }
  } catch (error) {
    console.error('Erro ao criar bancos:', error);
    throw error;
  }
};

const seedIncomeCategories = async () => {
  try {
    // Verifica se já existem categorias de receita
    const existingCategories = await Category.findAll({
      where: { type: 'income' }
    });

    if (existingCategories.length === 0) {
      // Cria as categorias de receita
      for (const category of incomeCategories) {
        const createdCategory = await Category.create({
          category_name: category.category_name,
          type: 'income'
        });

        // Cria as subcategorias
        await Promise.all(
          category.subcategories.map(subcategoryName =>
            SubCategory.create({
              subcategory_name: subcategoryName,
              category_id: createdCategory.id
            })
          )
        );
      }
      console.log('Categorias e subcategorias de receita criadas com sucesso!');
    } else {
      console.log('Categorias de receita já existem no banco de dados.');
    }
  } catch (error) {
    console.error('Erro ao criar categorias de receita:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    // Verifica se já existem categorias de despesa
    const existingCategories = await Category.findAll({
      where: { type: 'expense' }
    });
    if (existingCategories.length === 0) {
      await seedCategories();
    } else {
      console.log('Categorias de despesa já existem no banco de dados.');
    }

    // Executa o seed de subcategorias de despesa
    await seedSubCategories();

    // Executa o seed de categorias e subcategorias de receita
    await seedIncomeCategories();

    // Executa o seed de bancos
    await seedBanks();

    // Executa o seed de usuário e despesas
    await seedUserAndExpenses();

    // Executa o seed de ganhos
    await seedUserAndIncomes();

    console.log('Todos os seeds foram executados com sucesso!');
  } catch (error) {
    console.error('Erro ao executar seeds:', error);
    throw error;
  }
};

export default seedDatabase; 