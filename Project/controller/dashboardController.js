  const User = require("../models/users");
  const Product = require("../models/products");
  const Category = require("../models/category");
  const Order = require("../models/orders");
  const fs = require('fs')
  const dashController = {}

  async function chart() {
    try {
      
      const ordersPie = await Order.find()
      const ordersCount = {
        pending: 0,
        shipped: 0,
        processing: 0,
        delivered: 0,
        returned: 0,
      }

      ordersPie.forEach((order) => {
        if (order.status === "Pending") {
          ordersCount.pending++
        } else if (order.status === "Shipped") {
          ordersCount.shipped++
        }  else if (order.status === "Delivered" ) {
          ordersCount.delivered++
        } else if (order.status === "Cancelled") {
          ordersCount.returned++
        }
      })

      return ordersCount;
    } catch (error) {
      console.log("An error occured in orders count function chart", error.message);
    }
  }
  async function monthgraph() {
    try {
      const ordersCountByMonth = await Order.aggregate([
        {
          $project: {
            month: { $month: { date: '$orderDate' } }, 
          },
        },
        {
          $group: {
            _id: '$month',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      
     

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const ordersCountByMonthWithNames = months.map(month => {
        const entry = ordersCountByMonth.find(item => item._id === months.indexOf(month) + 1);
        return {
            month: month,
            count: entry ? entry.count : 0,
        };
    });
    

    
  
  
      const labels = ordersCountByMonthWithNames.map((val) => val.month)
      const count = ordersCountByMonthWithNames.map((val) => val.count)

      
      return {
        labels: labels,
        count: count
      }
    } catch (error) {
      console.log('Error retrieving orders in graph function:', error.message);
    }
  }
  async function yeargraph() {
    try {
      const ordersCountByYear = await Order.aggregate([
        {
          $project: {
            year: { $year: { date: '$orderDate' } },
          },
        },
        {
          $group: {
            _id: '$year',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
  
      const labels = ordersCountByYear.map((val) => val._id.toString());
      const count = ordersCountByYear.map((val) => val.count);
  
      return {
        labels: labels,
        count: count
      };
    } catch (error) {
      console.log('Error retrieving orders in yeargraph function:', error.message);
    }
  }

  dashController.getDashboard = async (req, res,next) => {
    try {
      const users = await User.find().exec();
      const orders = await Order.find().exec();
      const products = await Product.find().exec();
      const ordersPie = await chart()
      const ordersGraph = await monthgraph();
      const ordersYearGraph = await yeargraph();
    
      res.render("admin/dashboard", { title: "Admin Home", users: users,orders:orders,products:products, ordersPie:ordersPie,ordersGraph: ordersGraph,ordersYearGraph: ordersYearGraph});
    } catch (err) {
      next(err);
    }
  },
  dashController.fetchDashboard = async (req, res, next) => {
    try {
      const users = await User.find().exec();
      const orders = await Order.find().exec();
      const products = await Product.find().exec();
      const ordersPie = await chart();
  
      
      res.json({
        title: "Admin Home",
        users: users,
        orders: orders,
        products: products,
        ordersPie: ordersPie,
      });
    } catch (err) {
      next(err);
    }
  };

  module.exports = dashController;