export const injectModelContext = (req, res, next) => {
  // Injeta o contexto do usuário nos models
  if (req.user) {
    req.app.locals.models.forEach(model => {
      model.context = {
        user: {
          id: req.user.id
        }
      };
    });
  }
  next();
}; 