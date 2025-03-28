const verifyCode = async (req, res) => {
  try {
    const { email, code, name, desired_budget, financialGoalName, financialGoalAmount, financialGoalPeriodType, financialGoalPeriodValue, selectedBanks } = req.body;

    // Validação do código...
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Calcula a data final do objetivo
    const startDate = new Date();
    let endDate = new Date(startDate);

    switch (financialGoalPeriodType) {
      case 'days':
        endDate.setDate(startDate.getDate() + parseInt(financialGoalPeriodValue));
        break;
      case 'months':
        endDate.setMonth(startDate.getMonth() + parseInt(financialGoalPeriodValue));
        break;
      case 'years':
        endDate.setFullYear(startDate.getFullYear() + parseInt(financialGoalPeriodValue));
        break;
    }

    // Atualiza o usuário com os novos dados
    await user.update({
      name,
      financial_goal_name: financialGoalName,
      financial_goal_amount: financialGoalAmount,
      financial_goal_start_date: startDate,
      financial_goal_end_date: endDate
    });

    // Associa os bancos selecionados ao usuário
    if (selectedBanks && selectedBanks.length > 0) {
      await user.setBanks(selectedBanks);
    }

    // Gera o token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        financial_goal_name: user.financial_goal_name,
        financial_goal_amount: user.financial_goal_amount,
        financial_goal_start_date: user.financial_goal_start_date,
        financial_goal_end_date: user.financial_goal_end_date,
        telegram_verified: user.telegram_verified
      }
    });
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ message: 'Erro ao verificar código' });
  }
}; 