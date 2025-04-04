import { Bank, Category } from '../models/index.js';

// import { seedUserAndExpenses } from './userAndExpensesSeeder.js';
// import { seedUserAndIncomes } from './userAndIncomesSeeder.js';

const banks = [
  { "name": "Caixa Econômica Federal", "code": "104" },
  { "name": "Bradesco", "code": "237" },
  { "name": "Itaú", "code": "341" },
  { "name": "Banco do Brasil", "code": "001" },
  { "name": "Santander", "code": "033" },
  { "name": "Nubank", "code": "260" },
  { "name": "Inter", "code": "077" },
  { "name": "C6 Bank", "code": "336" },
  { "name": "Sicoob", "code": "756" },
  { "name": "Sicredi", "code": "748" },
  { "name": "BTG Pactual", "code": "208" },
  { "name": "Safra", "code": "422" },
  { "name": "Citibank", "code": "745" },
  { "name": "Next", "code": "237" },
  { "name": "PicPay", "code": "380" },
  { "name": "Votorantim", "code": "655" },
  { "name": "Pan", "code": "623" },
  { "name": "Original", "code": "212" },
  { "name": "Neon", "code": "735" },
  { "name": "BMG", "code": "318" },
  { "name": "Daycoval", "code": "707" },
  { "name": "Sofisa", "code": "637" },
  { "name": "Modal", "code": "746" },
  { "name": "Bari", "code": "330" },
  { "name": "Topázio", "code": "082" },
  { "name": "Mercantil do Brasil", "code": "389" },
  { "name": "Banestes", "code": "021" },
  { "name": "Banrisul", "code": "041" },
  { "name": "do Nordeste", "code": "004" },
  { "name": "da Amazônia", "code": "003" },
  { "name": "ABC Brasil", "code": "246" },
  { "name": "Alfa", "code": "025" },
  { "name": "Agibank", "code": "121" },
  { "name": "B3", "code": "096" },
  { "name": "BNP Paribas Brasil", "code": "752" },
  { "name": "Cargill", "code": "040" },
  { "name": "Credit Suisse (Brasil)", "code": "505" },
  { "name": "Digio", "code": "335" },
  { "name": "Fibra", "code": "224" },
  { "name": "Guanabara", "code": "612" },
  { "name": "Industrial do Brasil", "code": "604" },
  { "name": "Investcred Unibanco", "code": "249" },
  { "name": "J.P. Morgan", "code": "376" },
  { "name": "Mercantil de Investimentos", "code": "389" },
  { "name": "Morgan Stanley", "code": "066" },
  { "name": "Nacional de Desenvolvimento Econômico e Social (BNDES)", "code": "007" },
  { "name": "Original do Agronegócio", "code": "079" },
  { "name": "Pine", "code": "643" },
  { "name": "Ribeirão Preto", "code": "741" },
  { "name": "Semear", "code": "743" },
  { "name": "Société Générale Brasil", "code": "366" },
  { "name": "Toyota do Brasil", "code": "412" },
  { "name": "Volkswagen", "code": "069" },
  { "name": "Western Union", "code": "119" },
  { "name": "Yamaha Motor", "code": "124" },
  { "name": "Bancoob", "code": "756" },
  { "name": "Banpará", "code": "037" },
  { "name": "BBM", "code": "107" },
  { "name": "Bexs Banco de Câmbio", "code": "144" },
  { "name": "BNY Mellon Banco", "code": "017" },
  { "name": "BRB - Banco de Brasília", "code": "070" },
  { "name": "BS2", "code": "218" },
  { "name": "Caterpillar Financial Services", "code": "263" },
  { "name": "CM Capital Markets", "code": "180" },
  { "name": "Cofibra", "code": "413" },
  { "name": "Outro", "code": "000" }

];

const incomeCategories = [
  {
    category_name: 'Salário',
    type: 'income'
  },
  {
    category_name: 'Freelance',
    type: 'income'
  },
  {
    category_name: 'Investimentos',
    type: 'income'
  },
  {
    category_name: 'Aluguel',
    type: 'income'
  },
  {
    category_name: 'Vendas',
    type: 'income'
  },
  {
    category_name: 'Rendimentos',
    type: 'income'
  },
  {
    category_name: 'Negócio Próprio',
    type: 'income'
  },
  {
    category_name: 'Benefícios',
    type: 'income'
  },
  {
    category_name: 'Outros',
    type: 'income'
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
    // Verifica se já existem categorias de ganho
    const existingCategories = await Category.findAll({
      where: { type: 'income' }
    });

    if (existingCategories.length === 0) {
      // Cria as categorias de ganho
      for (const category of incomeCategories) {
        const createdCategory = await Category.create({
          category_name: category.category_name,
          type: 'income'
        });
      }
      console.log('Categorias de ganho criadas com sucesso!');
    } else {
      console.log('Categorias de ganho já existem no banco de dados.');
    }
  } catch (error) {
    console.error('Erro ao criar categorias de ganho:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {

    // Executa o seed de categorias de ganho
    await seedIncomeCategories();

    // Executa o seed de bancos
    await seedBanks();

    // Executa o seed de usuário e despesas
    // await seedUserAndExpenses();

    // Executa o seed de receitas
    // await seedUserAndIncomes();

    console.log('Todos os seeds foram executados com sucesso!');
  } catch (error) {
    console.error('Erro ao executar seeds:', error);
    throw error;
  }
};

export default seedDatabase; 