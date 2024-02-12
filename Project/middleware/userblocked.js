const User = require("../models/users");

const isBlockedUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user && user.isBlocked) {
      req.session.destroy();
      return res.redirect("/");
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = isBlockedUser;
