import { Bank, Category, Payment, User } from '../../models/index.js';

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
  { category_name: 'Salário', type: 'income' },
  { category_name: 'Freelance', type: 'income' },
  { category_name: 'Investimentos', type: 'income' },
  { category_name: 'Aluguel', type: 'income' },
  { category_name: 'Vendas', type: 'income' },
  { category_name: 'Rendimentos', type: 'income' },
  { category_name: 'Negócio Próprio', type: 'income' },
  { category_name: 'Benefícios', type: 'income' },
  { category_name: 'Outros', type: 'income' }
];

const expenseCategories = [  
    { "category_name": "Moradia", "type": "expense" },
    { "category_name": "Alimentação", "type": "expense" },
    { "category_name": "Transporte", "type": "expense" },
    { "category_name": "Saúde", "type": "expense" },
    { "category_name": "Educação", "type": "expense" },
    { "category_name": "Lazer", "type": "expense" },
    { "category_name": "Vestuário", "type": "expense" },
    { "category_name": "Contas", "type": "expense" },
    { "category_name": "Impostos", "type": "expense" },
    { "category_name": "Outros", "type": "expense" },
    { "category_name": "Investimentos", "type": "expense" },
    { "category_name": "Fatura Cartão de Crédito", "type": "expense" },
    { "category_name": "Água", "type": "expense" },
    { "category_name": "Luz", "type": "expense" },
    { "category_name": "Internet", "type": "expense" },
    { "category_name": "Condomínio", "type": "expense" },
    { "category_name": "IPTU", "type": "expense" },
    { "category_name": "IPVA", "type": "expense" },
    { "category_name": "Seguro", "type": "expense" },
    { "category_name": "Manutenção e Reparos", "type": "expense" },
    { "category_name": "Despesas com Pets", "type": "expense" },
    { "category_name": "Assinaturas e Serviços", "type": "expense" },
    { "category_name": "Presentes e Doações", "type": "expense" },
    { "category_name": "Cuidados Pessoais", "type": "expense" },
    { "category_name": "Entretenimento", "type": "expense" },
    { "category_name": "Viagens", "type": "expense" },
    { "category_name": "Telefonia", "type": "expense" },
    { "category_name": "Combustível", "type": "expense" },
    { "category_name": "Serviços Financeiros", "type": "expense" },
    { "category_name": "Roupas e Acessórios", "type": "expense" },
    { "category_name": "Higiene e Beleza", "type": "expense" },
    { "category_name": "Apps e Jogos", "type": "expense" },
    { "category_name": "Plataformas de Streaming", "type": "expense" },
    { "category_name": "Assinaturas Digitais", "type": "expense" },
    { "category_name": "Licenças de Software", "type": "expense" }  
];

const seedBanks = async () => {
  try {
    // Busca todos os bancos existentes
    const existingBanks = await Bank.findAll();
    
    // Mapeia os códigos dos bancos já cadastrados
    const existingBankCodes = existingBanks.map(bank => bank.code);
    
    // Filtra apenas os bancos que ainda não existem
    const banksToCreate = banks.filter(bank => !existingBankCodes.includes(bank.code));
    
    if (banksToCreate.length > 0) {
      await Bank.bulkCreate(banksToCreate);
      console.log(`${banksToCreate.length} novos bancos foram criados com sucesso!`);
    } else {
      console.log('Todos os bancos já existem no banco de dados.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar bancos:', error);
    return false;
  }
};

const seedExpenseCategories = async () => {
  try {
    // Busca todas as categorias de despesa existentes
    const existingCategories = await Category.findAll({
      where: { type: 'expense' }
    });
    
    // Mapeia os nomes das categorias já cadastradas
    const existingCategoryNames = existingCategories.map(category => category.category_name);
    
    // Filtra apenas as categorias que ainda não existem
    const categoriesToCreate = expenseCategories.filter(
      category => !existingCategoryNames.includes(category.category_name)
    );
    
    if (categoriesToCreate.length > 0) {
      await Category.bulkCreate(categoriesToCreate);
      console.log(`${categoriesToCreate.length} novas categorias de despesa criadas com sucesso!`);
    } else {
      console.log('Todas as categorias de despesa já existem no banco de dados.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar categorias de despesa:', error);
    return false;
  }
};    

const seedIncomeCategories = async () => {
  try {
    // Busca todas as categorias de receita existentes
    const existingCategories = await Category.findAll({
      where: { type: 'income' }
    });
    
    // Mapeia os nomes das categorias já cadastradas
    const existingCategoryNames = existingCategories.map(category => category.category_name);
    
    // Filtra apenas as categorias que ainda não existem
    const categoriesToCreate = incomeCategories.filter(
      category => !existingCategoryNames.includes(category.category_name)
    );
    
    if (categoriesToCreate.length > 0) {
      await Category.bulkCreate(categoriesToCreate);
      console.log(`${categoriesToCreate.length} novas categorias de receita criadas com sucesso!`);
    } else {
      console.log('Todas as categorias de receita já existem no banco de dados.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar categorias de receita:', error);
    return false;
  }
};

const seedPayments = async (forceUpdate = false) => {
  console.log('Verificando se é necessário adicionar dados de pagamento...');
  
  try {
    const count = await Payment.count();
    
    if (count > 0 && !forceUpdate) {
      console.log('Dados de pagamento já existem, pulando...');
      return true;
    }
    
    console.log('Adicionando dados de pagamento...');
    
    // Buscar todos os usuários
    const users = await User.findAll();
    
    if (users.length === 0) {
      console.log('Nenhum usuário encontrado para criar pagamentos de teste');
      return true;
    }
    
    // Atualizar todos os usuários para aceitar os termos
    await Promise.all(users.map(user => 
      user.update({ accepted_terms: true })
    ));
    console.log(`Termos de uso atualizados para ${users.length} usuários!`);
    
    const paymentPromises = users.map(user => {
      // Criar um pagamento para cada usuário
      const trialExpirationDate = new Date();
      trialExpirationDate.setDate(trialExpirationDate.getDate() + 7); // 7 dias de teste
      
      return Payment.create({
        user_id: user.id,
        subscription_expiration: trialExpirationDate,
        payment_status: 'approved',
        payment_method: 'trial',
        payment_amount: 0,
        payment_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
    });
    
    await Promise.all(paymentPromises);
    console.log(`Dados de pagamento adicionados com sucesso para ${users.length} usuários!`);
    return true;
  } catch (error) {
    console.error('Erro ao criar pagamentos de teste:', error);
    return false;
  }
};

const seedDatabase = async () => {
  try {
    const results = await Promise.allSettled([
      seedIncomeCategories(),
      seedBanks(),
      seedExpenseCategories(),
      seedPayments()
    ]);
    
    const failures = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value === false));
    
    if (failures.length > 0) {
      console.warn(`Alguns seeds falharam: ${failures.length} falhas`);
    } else {
      console.log('Todos os seeds foram executados com sucesso!');
    }

    return failures.length === 0;
  } catch (error) {
    console.error('Erro ao executar seeds:', error);
    return false;
  }
};

export default seedDatabase; 