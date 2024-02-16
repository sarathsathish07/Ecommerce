  const User = require("../models/users");
  const Product = require("../models/products");
  const Order = require("../models/orders");  
  const PDFDocument = require('pdfkit');
  const fs = require('fs')
  const pdf = require('html-pdf');

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
    

generateReport: async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const orders = await Order.find({
      orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).populate('items.product');

    let html = `<html><head><style>
                table {
                  width: 100%;
                  border-collapse: collapse;
                }
                th, td {
                  padding: 8px;
                  text-align: left;
                  border-bottom: 1px solid #ddd;
                }
                th {
                  background-color: #f2f2f2;
                }
                .status-pending {
                  color: orange;
                }
                .status-shipped {
                  color: green;
                }
                .status-delivered {
                  color: blue;
                }
                .status-cancelled {
                  color: red;
                }
                </style></head><body><h1>Order Details Report</h1><p>Start Date: ${startDate}</p><p>End Date: ${endDate}</p><table><thead><tr><th>Order ID</th><th>Order Date</th><th>Status</th><th>Payment Status</th><th>Quantity</th><th>Price</th></tr></thead><tbody>`;

    orders.forEach(order => {
      html += `<tr><td>${order.trackingId}</td><td>${order.orderDate.toDateString()}</td><td class="status-${order.status.toLowerCase()}">${order.status}</td>`;


      order.items.forEach(item => {
        html += `<td>${order.paymentStatus}</td><td>${item.quantity}</td><td>${item.price}</td></tr>`;
      });
    });

    html += `</tbody></table></body></html>`;

    pdf.create(html).toFile('./temp/report.pdf', (err, res) => {
      if (err) throw err;
      console.log(res);
    });

    res.json({ reportUrl: './temp/report.pdf' });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
},

    
    
    report: (req, res) => {
      const filePath = '../temp/report.pdf'; 
      
      res.sendFile(filePath, { root: '.' }, (err) => {
          if (err) {
              console.error('Error sending file:', err);
              res.status(404).send('File not found');
          }
      });
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
