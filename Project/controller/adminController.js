const User = require("../models/users");
const Product = require("../models/products");
const Order = require("../models/orders");

const credentials = {
  email: "admin@gmail.com",
  password: "12345",
};

const adminController = {
  getAdminLogin: (req, res,next) => {
    try {
      res.render("admin/adminlogin", { title: "Admin Login" });
    } catch (err) {
      next(err);
    }
  },
  postAdminLogin: (req, res,next) => {
    try {
      if (
        req.body.email == credentials.email &&
        req.body.password == credentials.password
      ) {
        req.session.admin = req.body.email;
        req.session.isLoggedAdmin = true;
        res.redirect("/dashboard");
      } else {
        res.render("admin/adminlogin", {
          title: "Admin Login",
          alert: "Invalid email or password",
        });
      }
    } catch (err) {
      next(err);
    }
  },
  getDashboard: async (req, res,next) => {
    try {
      const users = await User.find().exec();
      res.render("admin/dashboard", { title: "Admin Home", users: users });
    } catch (err) {
      next(err);
    }
  },
  getUsers: async (req, res,next) => {
    const perPage = 5;
    const page = req.query.page || 1;
    try {
      const totalUsers = await User.countDocuments();

      const users = await User.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const totalPages = Math.ceil(totalUsers / perPage);

      res.render("admin/userlist", {
        title: "Users",
        users: users,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  getUsersPagination: async (req, res,next) => {
    const perPage = 5;
    const page = req.query.page || 1;

    try {
      const totalUsers = await User.countDocuments();

      const users = await User.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const totalPages = Math.ceil(totalUsers / perPage);

      res.render("admin/userlist", {
        title: "Users",
        users: users,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  blockUser: async (req, res,next) => {
    try {
      const userId = req.params.userId;
      await User.findByIdAndUpdate(userId, { isBlocked: true });
      req.session.isLogged = false;
      req.session.isBlocked = true;
      req.session.user = null;

      res.redirect("/userlist");
    } catch (err) {
      next(err);
    }
  },

  unblockUser: async (req, res,next) => {
    try {
      const userId = req.params.userId;

      await User.findByIdAndUpdate(userId, { isBlocked: false });
      req.session.isLogged = true;
      req.session.isBlocked = false;

      res.redirect("/userlist");
    } catch (err) {
      next(err);
    }
  },

  getOrders: async (req, res,next) => {
    const perPage = 5;
    const page = req.query.page || 1;
    try {
      const totalOrders = await Order.countDocuments();

      const orders = await Order.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const totalPages = Math.ceil(totalOrders / perPage);

      res.render("admin/orderlist", {
        title: "Orders",
        orders: orders,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  getOrdersPagination: async (req, res,next) => {
    const perPage = 5;
    const page = req.query.page || 1;

    try {
      const totalOrders = await Order.countDocuments();

      const orders = await Order.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const totalPages = Math.ceil(totalOrders / perPage);

      res.render("admin/orderlist", {
        title: "Orders",
        orders: orders,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  getOrderDetailsPage: async (req, res,next) => {
    try {
      const orderId = req.params.id;

      const order = await Order.findById(orderId).populate("items.product");

      res.render("admin/orderDetails", { order });
    } catch (err) {
      next(err);
    }
  },

  updateStatus: async (req, res,next) => {
    try {
      const { orderId, selectedStatus } = req.body;

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status: selectedStatus } },
        { new: true }
      );

      if (updatedOrder) {
        res.json({ success: true, updatedOrder });
      } else {
        res.status(404).json({ success: false, message: "Order not found" });
      }
    } catch (err) {
      next(err);
    }
  },

  getAdminLogout: (req, res,next) => {
    try {
      req.session.admin = null;
      req.session.isLoggedAdmin = false;
      res.render("admin/adminlogin", {
        title: "Admin Login",
        logout: "Logout successfully",
      });
    } catch (err) {
      next(err);
    }
  },
};
module.exports = adminController;
