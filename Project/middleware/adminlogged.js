const isLoggedAdmin = async (req, res, next) => {
  if (req.session.isLoggedAdmin) {
    res.redirect("/dashboard");
  } else {
    next();
  }
};

module.exports = isLoggedAdmin;
