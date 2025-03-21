// import { User, Expense, Category, Bank, SubCategory } from '../models/index.js';
// import { v4 as uuidv4 } from 'uuid';

// const generateRandomAmount = () => {
//   return Math.floor(Math.random() * (1000 - 10 + 1) + 10);
// };

// const generateRandomDate = (year, month) => {
//   const daysInMonth = new Date(year, month, 0).getDate();
//   const day = Math.floor(Math.random() * daysInMonth) + 1;
//   return new Date(year, month - 1, day);
// };

// export const seedUserAndExpenses = async () => {
//   try {
//     // Verificar se o usuário já existe
//     let user = await User.findOne({ where: { email: 'teste@teste.com' } });

//     if (user) {
//       // Atualizar usuário existente
//       await user.update({
//         name: 'Luiz',
//         is_active: true
//       });
//       console.log('Usuário teste atualizado com sucesso!');
//     } else {
//       // Criar novo usuário
//       user = await User.create({
//         name: 'Usuário Teste',
//         email: 'teste@teste.com',
//         is_active: true,
//         financial_goal_name: 'Comprar uma casa',
//         financial_goal_amount: 500000,
//         financial_goal_date: new Date('2025-12-31')
//       });
//       console.log('Usuário teste criado com sucesso!');
//     }

//     // const user2 = await User.create({
//     //   name: 'Usuário Teste 2',
//     //   email: 'teste2@teste.com',
//     //   is_active: true,
//     //   financial_goal_name: 'Comprar um carro',
//     //   financial_goal_amount: 80000,
//     //   financial_goal_date: new Date('2025-12-31')
//     // });

//     // Verificar se já existem despesas para este usuário
//     const existingExpenses = await Expense.count({ where: { user_id: user.id } });
//     if (existingExpenses > 0) {
//       console.log('Despesas já existem para este usuário. Pulando criação de despesas...');
//       return;
//     }

//     // Buscar todas as categorias com suas subcategorias e bancos
//     const [categoriesWithSubs, banks] = await Promise.all([
//       Category.findAll({
//         where: { type: 'expense' },
//         include: [{
//           model: SubCategory,
//           required: true
//         }]
//       }),
//       Bank.findAll()
//     ]);

//     if (categoriesWithSubs.length === 0 || banks.length === 0) {
//       throw new Error('Categorias, subcategorias e bancos precisam ser criados primeiro');
//     }

//     const createExpensesForMonth = async (year, month, quantity) => {
//       const expenses = [];
//       const paymentMethods = ['card', 'pix'];

//       for (let i = 0; i < quantity; i++) {
//         const randomCategory = categoriesWithSubs[Math.floor(Math.random() * categoriesWithSubs.length)];
//         const randomSubcategory = randomCategory.SubCategories[
//           Math.floor(Math.random() * randomCategory.SubCategories.length)
//         ];
//         const randomBank = banks[Math.floor(Math.random() * banks.length)];
//         const randomPaymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
//         const hasInstallments = Math.random() < 0.3; // 30% de chance de ter parcelas
//         const isRecurring = !hasInstallments && Math.random() < 0.2; // 20% de chance de ser fixa (se não for parcelada)
//         const installmentGroupId = hasInstallments ? uuidv4() : null;
//         const recurringGroupId = isRecurring ? uuidv4() : null;
//         const totalInstallments = hasInstallments ? Math.floor(Math.random() * 11) + 2 : null; // 2-12 parcelas

//         if (hasInstallments) {
//           const baseAmount = generateRandomAmount();
//           const amountPerInstallment = baseAmount / totalInstallments;
//           const baseDate = generateRandomDate(year, month);

//           for (let j = 0; j < totalInstallments; j++) {
//             const installmentDate = new Date(baseDate);
//             installmentDate.setMonth(baseDate.getMonth() + j);

//             expenses.push({
//               user_id: user.id,
//               description: `Despesa parcelada ${i + 1} (${j + 1}/${totalInstallments})`,
//               amount: amountPerInstallment,
//               category_id: randomCategory.id,
//               subcategory_id: randomSubcategory.id,
//               bank_id: randomBank.id,
//               expense_date: installmentDate,
//               payment_method: randomPaymentMethod,
//               has_installments: true,
//               current_installment: j + 1,
//               total_installments: totalInstallments,
//               installment_group_id: installmentGroupId,
//               is_recurring: false
//             });
//           }
//         } else {
//           expenses.push({
//             user_id: user.id,
//             description: isRecurring ? `Despesa Fixa ${i + 1}` : `Despesa ${i + 1}`,
//             amount: generateRandomAmount(),
//             category_id: randomCategory.id,
//             subcategory_id: randomSubcategory.id,
//             bank_id: randomBank.id,
//             expense_date: generateRandomDate(year, month),
//             payment_method: randomPaymentMethod,
//             has_installments: false,
//             is_recurring: isRecurring,
//             recurring_group_id: recurringGroupId
//           });
//         }
//       }

//       await Expense.bulkCreate(expenses);
//       console.log(`Criadas ${expenses.length} despesas para ${month}/${year}`);
//     };

//     // Criar 200 despesas para março/2025
//     await createExpensesForMonth(2025, 3, 200);

//     // Criar 50 despesas para os outros meses de 2025
//     for (let month = 1; month <= 12; month++) {
//       if (month !== 3) { // Pula março que já foi criado
//         await createExpensesForMonth(2025, month, 50);
//       }
//     }

//     // Criar 20 despesas para cada mês de 2024
//     for (let month = 1; month <= 12; month++) {
//       await createExpensesForMonth(2024, month, 20);
//     }

//     console.log('Seed de usuário e despesas concluído com sucesso!');
//   } catch (error) {
//     console.error('Erro ao criar seed de usuário e despesas:', error);
//     throw error;
//   }
// }; 