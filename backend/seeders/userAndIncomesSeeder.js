import { User, Income, Category, Bank, SubCategory } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const generateRandomAmount = () => {
  return Math.floor(Math.random() * (5000 - 500 + 1) + 500); // Valores maiores para ganhos
};

const generateRandomDate = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return new Date(year, month - 1, day);
};

export const seedUserAndIncomes = async () => {
  try {
    // Verificar se o usuário já existe
    let user = await User.findOne({ where: { email: 'teste@teste.com' } });

    if (!user) {
      // Se não encontrou o usuário, não prossegue
      console.log('Usuário teste não encontrado. Execute primeiro o seedUserAndExpenses.');
      return;
    }

    // Verificar se já existem ganhos para este usuário
    const existingIncomes = await Income.count({ where: { user_id: user.id } });
    if (existingIncomes > 0) {
      console.log('Ganhos já existem para este usuário. Pulando criação de ganhos...');
      return;
    }

    // Buscar todas as categorias com suas subcategorias e bancos
    const [categoriesWithSubs, banks] = await Promise.all([
      Category.findAll({
        include: [{
          model: SubCategory,
          required: true
        }]
      }),
      Bank.findAll()
    ]);

    if (categoriesWithSubs.length === 0 || banks.length === 0) {
      throw new Error('Categorias, subcategorias e bancos precisam ser criados primeiro');
    }

    const createIncomesForMonth = async (year, month, quantity) => {
      const incomes = [];

      for (let i = 0; i < quantity; i++) {
        const randomCategory = categoriesWithSubs[Math.floor(Math.random() * categoriesWithSubs.length)];
        const randomSubcategory = randomCategory.SubCategories[
          Math.floor(Math.random() * randomCategory.SubCategories.length)
        ];
        const randomBank = banks[Math.floor(Math.random() * banks.length)];
        const isRecurring = Math.random() < 0.3; // 30% de chance de ser fixo
        const recurringGroupId = isRecurring ? uuidv4() : null;

        incomes.push({
          user_id: user.id,
          description: isRecurring ? `Ganho Fixo ${i + 1}` : `Ganho ${i + 1}`,
          amount: generateRandomAmount(),
          category_id: randomCategory.id,
          subcategory_id: randomSubcategory.id,
          bank_id: randomBank.id,
          date: generateRandomDate(year, month),
          is_recurring: isRecurring,
          recurring_group_id: recurringGroupId
        });
      }

      await Income.bulkCreate(incomes);
      console.log(`Criados ${incomes.length} ganhos para ${month}/${year}`);
    };

    // Criar 100 ganhos para março/2025 (menos que despesas, pois ganhos são geralmente menos frequentes)
    await createIncomesForMonth(2025, 3, 100);

    // Criar 25 ganhos para os outros meses de 2025
    for (let month = 1; month <= 12; month++) {
      if (month !== 3) { // Pula março que já foi criado
        await createIncomesForMonth(2025, month, 25);
      }
    }

    // Criar 10 ganhos para cada mês de 2024
    for (let month = 1; month <= 12; month++) {
      await createIncomesForMonth(2024, month, 10);
    }

    console.log('Seed de ganhos concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao criar seed de ganhos:', error);
    throw error;
  }
}; 