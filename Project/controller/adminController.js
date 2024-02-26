  const User = require("../models/users");
  const Product = require("../models/products");
  const Order = require("../models/orders");  
  const Wallet = require("../models/wallet");  
  const fs = require('fs')
  const pdf = require('html-pdf');

  const credentials = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
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
    
    getUsers: async (req, res, next) => {
      const perPage = 5;
      const page = req.query.page || 1;
      try {
        const totalUsers = await User.aggregate([
          {
            $group: {
              _id: null,
              count: { $sum: 1 }
            }
          }
        ]);
    
        const totalCount = totalUsers.length > 0 ? totalUsers[0].count : 0;
    
        const users = await User.find()
          .skip(perPage * page - perPage)
          .limit(perPage)
          .exec();
    
        const totalPages = Math.ceil(totalCount / perPage);
    
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
    

    getUsersPagination: async (req, res, next) => {
      const perPage = 5;
      const page = parseInt(req.query.page) || 1;
    
      try {
        const result = await User.aggregate([
          {
            $facet: {
              totalCount: [
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              users: [
                { $skip: perPage * page - perPage },
                { $limit: perPage }
              ]
            }
          },
          {
            $unwind: "$totalCount" 
          }
        ]);
    
        const totalCount = result[0].totalCount.count;
    
        const totalPages = Math.ceil(totalCount / perPage);
    
        const users = result[0].users;
    
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

    getOrders: async (req, res, next) => {
      const perPage = 5;
      const page = req.query.page || 1;
    
      try {
        const totalOrders = await Order.countDocuments();
    
        const orders = await Order.aggregate([
          { $sort: { orderDate: -1 } },
          { $skip: perPage * page - perPage },
          { $limit: perPage }
        ]);
    
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
    

    getOrdersPagination: async (req, res, next) => {
      const perPage = 5;
      const page = req.query.page || 1;
    
      try {
        const totalOrders = await Order.countDocuments();
    
        const orders = await Order.aggregate([
          { $sort: { orderDate: -1 } },
          { $skip: perPage * page - perPage },
          { $limit: perPage }
        ]);
    
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

    updateStatus: async (req, res, next) => {
      try {
        const { orderId, selectedStatus } = req.body;
    
        const order = await Order.findById(orderId).populate('items.product');
        if (!order) {
          return res.status(404).json({ success: false, message: 'Order not found' });
        }
    
        if (selectedStatus === 'Cancelled') {
          if (order.paymentStatus === 'Paid') {
            const wallet = await Wallet.findOne({ userId: order.userID });
            if (!wallet) {
              return res.status(404).json({ error: 'Wallet not found for user' });
            }
            // Refund the amount to the wallet
            wallet.balance += order.totalPrice;
            await wallet.save();
          }
    
          // Increment stock for each product in the order
          for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          }
        }
    
        const updatedOrder = await Order.findByIdAndUpdate(
          orderId,
          { $set: { status: selectedStatus } },
          { new: true }
        );
    
        if (updatedOrder) {
          res.json({ success: true, updatedOrder });
        } else {
          res.status(404).json({ success: false, message: 'Order not found' });
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
                    </style></head><body><h1>Order Details Report</h1><p>Start Date: ${startDate}</p><p>End Date: ${endDate}</p>`;
    
        if (orders.length === 0) {
          html += `<p style="font-size: 24px; font-weight: bold; color: #666666;">No records found</p>`;
    
        } else {
          html += `<table><thead><tr><th>Order ID</th><th>Order Date</th><th>Status</th><th>Payment Status</th><th>Quantity</th><th>Price</th></tr></thead><tbody>`;
    
          orders.forEach(order => {
            html += `<tr><td>${order.trackingId}</td><td>${order.orderDate.toDateString()}</td><td class="status-${order.status.toLowerCase()}">${order.status}</td>`;
    
    
            order.items.forEach(item => {
              html += `<td>${order.paymentStatus}</td><td>${item.quantity}</td><td>${item.price}</td></tr>`;
            });
          });
    
          html += `</tbody></table>`;
        }
    
        html += `</body></html>`;
    
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
  bestProducts:async (req, res, next) => {
    try {
      const bestSellingProducts = await Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 }, 
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $project: {
            _id: '$product._id',
            productTitle: '$product.productTitle',
            totalQuantity: 1,
          },
        },
      ]);
  
      res.render("admin/bestproducts",{ bestSellingProducts });
    } catch (err) {
      next(err);
    }
  },
  bestCategories:async (req, res, next) => {
    try {
      const bestSellingCategories = await Order.aggregate([
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        {
          $sort: { totalQuantity: -1 },
        },
        {
          $limit: 10, 
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category',
          },
        },
        { $unwind: '$category' },
        {
          $project: {
            _id: '$category._id',
            category: '$category.category',
            totalQuantity: 1,
          },
        },
      ]);
      res.render('admin/bestcategories', { bestSellingCategories });
    } catch (err) {
      next(err);
    }
  },
  bestBrands: async (req, res, next) => {
    try {
        const bestSellingBrands = await Order.aggregate([
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product.brand',
                    totalQuantity: { $sum: '$items.quantity' },
                },
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'brands',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'brand',
                },
            },
            { $unwind: '$brand' },
            {
                $project: {
                    _id: '$brand._id',
                    brandName: '$brand.brand',
                    totalQuantity: 1,
                },
            },
        ]);
        res.render('admin/bestbrands', { bestSellingBrands });
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
