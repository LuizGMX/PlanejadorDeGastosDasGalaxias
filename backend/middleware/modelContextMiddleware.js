export const injectModelContext = (req, res, next) => {
  // Injeta o contexto do usuário nos models
  if (req.user && req.app.locals.models) {
    const models = req.app.locals.models;
    
    // Itera sobre os modelos e define o contexto para cada um
    Object.values(models).forEach(model => {
      if (model) {
        model.context = {
          user: {
            id: req.user.id
          }
        };
      }
    });
  }
  next();
}; 