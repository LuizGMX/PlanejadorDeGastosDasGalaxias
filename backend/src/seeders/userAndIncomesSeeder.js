const Income = require('../models/income');

const userAndIncomesSeeder = async (user) => {
  const incomes = [
    {
      description: 'Salário',
      amount: 2000,
      date: new Date('2023-04-01'),
      category_id: 1,
      subcategory_id: 1,
      bank_id: 1,
      user_id: user.id,
      is_recurring: true,
      recurring_group_id: 1,
      start_date: new Date('2023-04-01'),
      end_date: new Date('2024-12-31')
    },
    {
      description: 'Aluguel',
      amount: 1000,
      date: new Date('2023-04-05'),
      category_id: 2,
      subcategory_id: 2,
      bank_id: 2,
      user_id: user.id,
      is_recurring: true,
      recurring_group_id: 2,
      start_date: new Date('2023-04-05'),
      end_date: new Date('2024-12-31')
    },
    {
      description: 'Conta de luz',
      amount: 150,
      date: new Date('2023-04-10'),
      category_id: 3,
      subcategory_id: 3,
      bank_id: 3,
      user_id: user.id,
      is_recurring: true,
      recurring_group_id: 3,
      start_date: new Date('2023-04-10'),
      end_date: new Date('2024-12-31')
    }
  ];

  for (const income of incomes) {
    await Income.create(income);
  }
};

module.exports = userAndIncomesSeeder; 