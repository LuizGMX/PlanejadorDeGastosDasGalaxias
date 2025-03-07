const { Sequelize } = require('sequelize');

module.exports = async (User, Expense, Category, CreditCard) => {
  try {
    // Criar um usuário de teste
    const user = await User.create({
      name: 'Usuário Teste',
      email: 'teste@teste.com',
      password: '$2b$10$YourHashedPasswordHere' // Senha: teste123
    });

    // Criar alguns cartões de crédito
    const cards = await CreditCard.bulkCreate([
      {
        user_id: user.id,
        card_name: 'Nubank Platinum',
        bank_name: 'nubank',
        is_favorite: true
      },
      {
        user_id: user.id,
        card_name: 'Inter Black',
        bank_name: 'inter',
        is_favorite: true
      },
      {
        user_id: user.id,
        card_name: 'Itaú Personnalité',
        bank_name: 'itau',
        is_favorite: false
      },
      {
        user_id: user.id,
        card_name: 'Bradesco Prime',
        bank_name: 'bradesco',
        is_favorite: false
      },
      {
        user_id: user.id,
        card_name: 'Santander Select',
        bank_name: 'santander',
        is_favorite: false
      },
      {
        user_id: user.id,
        card_name: 'BB Ourocard',
        bank_name: 'bb',
        is_favorite: false
      },
      {
        user_id: user.id,
        card_name: 'C6 Carbon',
        bank_name: 'c6',
        is_favorite: false
      },
      {
        user_id: user.id,
        card_name: 'XP Visa Infinite',
        bank_name: 'xp',
        is_favorite: false
      }
    ]);

    // Buscar todas as categorias e marcar algumas como favoritas
    const categories = await Category.findAll();
    await Promise.all([
      categories.find(c => c.category_name === 'Alimentação').update({ is_favorite: true }),
      categories.find(c => c.category_name === 'Transporte').update({ is_favorite: true }),
      categories.find(c => c.category_name === 'Moradia').update({ is_favorite: true })
    ]);

    // Array de descrições por categoria
    const descriptions = {
      'Alimentação': ['Supermercado', 'Restaurante', 'Delivery'],
      'Transporte': ['Uber', 'Combustível', 'Manutenção do carro'],
      'Moradia': ['Aluguel', 'Condomínio', 'IPTU'],
      'Saúde': ['Consulta médica', 'Farmácia', 'Plano de saúde'],
      'Educação': ['Curso online', 'Material escolar', 'Mensalidade'],
      'Lazer': ['Cinema', 'Netflix', 'Academia'],
      'Vestuário': ['Roupas', 'Calçados', 'Acessórios'],
      'Contas (água, luz, internet)': ['Conta de luz', 'Conta de água', 'Internet'],
      'Impostos': ['IPVA', 'IR', 'IPTU'],
      'Outros': ['Presente', 'Material de limpeza', 'Papelaria']
    };

    // Criar 10 despesas com datas e valores diferentes
    const despesas = [
      {
        amount: 250.50,
        description: 'Supermercado',
        payment_method: 'card',
        credit_card_id: cards[0].id, // Nubank
        category_id: categories.find(c => c.category_name === 'Alimentação').id,
        expense_date: '2024-01-15',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 89.90,
        description: 'Netflix e Spotify',
        payment_method: 'card',
        category_id: categories.find(c => c.category_name === 'Lazer').id,
        expense_date: '2024-01-20',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 150.00,
        description: 'Uber',
        payment_method: 'pix',
        category_id: categories.find(c => c.category_name === 'Transporte').id,
        expense_date: '2024-02-05',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 1200.00,
        description: 'Aluguel',
        payment_method: 'pix',
        category_id: categories.find(c => c.category_name === 'Moradia').id,
        expense_date: '2024-02-10',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 350.00,
        description: 'Conta de luz e água',
        payment_method: 'pix',
        category_id: categories.find(c => c.category_name === 'Contas (água, luz, internet)').id,
        expense_date: '2024-02-15',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 899.90,
        description: 'Curso de inglês',
        payment_method: 'card',
        category_id: categories.find(c => c.category_name === 'Educação').id,
        expense_date: '2024-03-01',
        installment_number: 1,
        total_installments: 3
      },
      {
        amount: 159.90,
        description: 'Farmácia',
        payment_method: 'card',
        category_id: categories.find(c => c.category_name === 'Saúde').id,
        expense_date: '2024-03-10',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 450.00,
        description: 'Roupas',
        payment_method: 'card',
        category_id: categories.find(c => c.category_name === 'Vestuário').id,
        expense_date: '2024-03-15',
        installment_number: 1,
        total_installments: 2
      },
      {
        amount: 2500.00,
        description: 'IPVA',
        payment_method: 'pix',
        category_id: categories.find(c => c.category_name === 'Impostos').id,
        expense_date: '2024-03-20',
        installment_number: 1,
        total_installments: 1
      },
      {
        amount: 180.00,
        description: 'Presente aniversário',
        payment_method: 'pix',
        category_id: categories.find(c => c.category_name === 'Outros').id,
        expense_date: '2024-03-25',
        installment_number: 1,
        total_installments: 1
      }
    ];

    // Adicionar user_id a todas as despesas
    const despesasComUsuario = despesas.map(despesa => ({
      ...despesa,
      user_id: user.id
    }));

    // Criar as despesas
    await Expense.bulkCreate(despesasComUsuario);
    
    console.log('Dados de teste criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
  }
}; 