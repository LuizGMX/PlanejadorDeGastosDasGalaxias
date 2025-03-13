router.post('/', async (req, res) => {
  try {
    const {
      description,
      amount,
      date,
      start_date,
      end_date,
      is_recurring,
      category_id,
      subcategory_id,
      bank_id
    } = req.body;

    const income = await Income.create({
      description,
      amount,
      date,
      start_date,
      end_date,
      is_recurring,
      category_id,
      subcategory_id,
      bank_id
    });

    res.status(201).json(income);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    await Income.destroy({
      where: {
        id: ids,
        is_recurring: false
      }
    });

    res.json({ 
      message: 'Receitas excluídas com sucesso',
      count: ids.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 