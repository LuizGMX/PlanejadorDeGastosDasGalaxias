router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    await Expense.destroy({
      where: {
        id: ids,
        has_installments: false,
        is_recurring: false
      }
    });

    res.json({ 
      message: 'Despesas excluídas com sucesso',
      count: ids.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 