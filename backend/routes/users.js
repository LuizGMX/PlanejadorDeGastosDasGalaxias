router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      net_income,
      financial_goal_name,
      financial_goal_amount,
      financial_goal_date
    } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (user.id !== req.user.id) {
      return res.status(403).json({ message: 'Não autorizado' });
    }

    await user.update({
      name,
      email,
      net_income,
      financial_goal_name,
      financial_goal_amount,
      financial_goal_date
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      net_income: user.net_income,
      financial_goal_name: user.financial_goal_name,
      financial_goal_amount: user.financial_goal_amount,
      financial_goal_date: user.financial_goal_date
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
}); 