  const User = require("../models/users");
  const Product = require("../models/products");
  const Cart = require("../models/userCart");
  const Order = require("../models/orders");
  const Wallet = require("../models/wallet");
  const Address = require("../models/address");
  const bcrypt = require("bcrypt");
  const mongoose = require('mongoose');
  const nodemailer = require("nodemailer");
  const randomstring = require("randomstring");
  const easyinvoice = require('easyinvoice');
  const path = require('path');
  const fs = require('fs')
  const saltPassword = 10;

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    },
  });

  const userController = {
    getLoginPage: (req, res,next) => {
      try {
        res.render("userlogin", { title: "Login" });
      } catch (err) {
        next(err);
      }
    },

    postLogin: async (req, res,next) => {
      try {
        const data = await User.findOne({ email: req.body.email });

        if (!data) {  
          res.render("usersignup", {
            title: "Signup",
            signup: "Account Doesn't Exist, Please signup",
          });
        } else if (!data.isVerified) {
          res.render("otpverification", {
            title: "OTP",
            alert:
              "Your account is not verified. Please check your email for the verification OTP.",
            email: req.body.email,
          });
        } else if (data.isBlocked) {
          res.render("userlogin", {
            title: "Login",
            alert: "Your account has been blocked",
          });
        } else {
          const passwordMatch = await bcrypt.compare(
            req.body.password,
            data.password
          );

          if (passwordMatch) {
            req.session.user = data;
            req.session.isLogged = true;
            req.session.userID = data._id;

            res.redirect("/");
          } else {
            res.render("userlogin", {
              title: "Login",
              alert: "Entered Email or password is incorrect",
            });
          }
        }
      } catch (err) {
        next(err);
      }
    },

    getHome: async (req, res, next) => {
      try {
          const products = await Product.aggregate([
              { $match: { isPublished: true } },
              { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
              { $unwind: "$category" },
              { $match: { "category.isListed": true } },
              { $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brand" } }, 
              { $unwind: "$brand" },
              { $match: { "brand.isListed": true } },
              { $limit:8}
          ]);
  
          res.render("home", {
              title: "Home",
              user: req.session.user,
              products: products,
          });
      } catch (err) {
          next(err);
      }
  },
  

    getSignupPage: (req, res,next) => {
      try {
        res.render("usersignup", { title: "Signup" });
      } catch (err) {
        next(err);
      }
    },

    postSignup: async (req, res,next) => {
      try {
        const existingEmail = await User.findOne({ email: req.body.email });

        if (existingEmail) {
          if (!existingEmail.isVerified) {
            return res.render("otpverification", {
              title: "OTP",
              email: req.body.email,
              alert: "Account already registered. Please verify your email.",
            });
          }

          return res.render("usersignup", {
            title: "Signup",
            alert: "Email already exists, Please try with another one",
          });
        }
        //  OTP generation
        const otp = randomstring.generate({
          length: 6,
          charset: "numeric",
        });

        const hashedPassword = await bcrypt.hash(req.body.password, saltPassword);
        const user = new User({
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          password: hashedPassword,
          otp: otp,
        });

        await user.save();

        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: req.body.email,
          subject: "Verification OTP",
          text: `Your OTP for email verification is: ${otp}`,
        };

        await transporter.sendMail(mailOptions);

        req.session.tempEmail = req.body.email;
        res.render("otpverification", {
          title: "OTP",
          email: req.session.tempEmail,
        });
      } catch (err) {
        next(err);
      }
    },

    getOTPVerificationPage: (req, res,next) => {
      try {
        const currentTime = new Date().getTime();
        const resendTime = req.session.resendTime || 0;

        const remainingTime = Math.max(0, 120000 - (currentTime - resendTime));

        res.render("otpverification", {
          title: "OTP",
          email: req.session.tempEmail,
          remainingTime: remainingTime,
        });
      } catch (err) {
        next(err);
      }
    },

    postVerifyOTP: async (req, res,next) => {
      try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
          return res.render("otpverification", {
            title: "OTP",
            email,
            alert: "User not found. Please check your email and try again.",
          });
        }

        if (user.otp === otp) {
          req.session.tempEmail = null;

          user.isVerified = true;
          await user.save();
          console.log(user._id);

          const wallet = new Wallet({
            userId: user._id,
            balance: 0
          })
          await wallet.save()

          req.session.resendTime = new Date().getTime();

          res.redirect("/login");
        } else {
          res.render("otpverification", {
            title: "OTP",
            email,
            alert: "Invalid OTP. Please try again.",
          });
        }
      } catch (err) {
        next(err);
      }
    },

    resendOTP: async (req, res,next) => {
      try {
        req.session.tempEmail = req.body.email;
        const userEmail = req.session.tempEmail;

        const user = await User.findOne({ email: userEmail });

        

        // OTP generation
        const newOTP = randomstring.generate({
          length: 6,
          charset: "numeric",
        });

        user.otp = newOTP;
        await user.save();

        const mailOptions = {
          from: "sarathsathish77@gmail.com",
          to: userEmail,
          subject: "New Verification OTP",
          text: `Your new OTP for email verification is: ${newOTP}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).redirect("/otpverification");
      } catch (err) {
        next(err);
      }
    },
    shopPage: async (req, res, next) => {
      try {
          const perPage = 9;
          const page = req.query.page || 1;
  
          const products = await Product.aggregate([
              { $match: { isPublished: true } },
              { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
              { $unwind: "$category" },
              { $match: { "category.isListed": true } },
              { $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brand" } }, 
              { $unwind: "$brand" },
              { $match: { "brand.isListed": true } },
              { $skip: perPage * (page - 1) },
              { $limit: perPage },
              { $sort: { time: -1 } },
          ]);
  
          const totalProducts = await Product.aggregate([
              { $match: { isPublished: true } },
              { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
              { $unwind: "$category" },
              { $match: { "category.isListed": true } },
              { $lookup: { from: "brands", localField: "brand", foreignField: "_id", as: "brand" } }, 
              { $unwind: "$brand" },
              { $match: { "brand.isListed": true } },
              { $count: "count" }
          ]);
  
          const totalPages = totalProducts.length > 0 ? Math.ceil(totalProducts[0].count / perPage) : 0;

  
          res.render("shop", {
              title: "Shop",
              products: products,
              totalPages: totalPages,
              currentPage: page,
              perPage: perPage,
              user: req.session.user
          });
      } catch (err) {
          next(err);
      }
  },
  

  getShopPagination: async (req, res, next) => {
    try {
        const perPage = 9;
        const page = req.query.page || 1;

        const aggregatePipeline = [
            { $match: { isPublished: true } },
            { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
            { $unwind: "$category" },
            { $match: { "category.isListed": true } },
            { $project: { _id: 1, title: 1, price: 1, category: "$category.name" } }, 
            { $skip: perPage * (page - 1) },
            { $limit: perPage }
        ];

        const products = await Product.aggregate(aggregatePipeline);

        const totalProductsCount = await Product.countDocuments({ isPublished: true });
        const totalPages = Math.ceil(totalProductsCount / perPage);

        res.render("shop", {
            title: "Shop",
            products: products,
            totalPages: totalPages,
            currentPage: page,
            perPage: perPage,
            user: req.session.user
        });
    } catch (err) {
        next(err);
    }
},

    getProductDetailsPage: async (req, res,next) => {
      try {
       
        const id = new mongoose.Types.ObjectId(req.params.id);
       
        const product = await Product.aggregate([
          {
            $match:{_id:id}
          }
        ])
        if (!product) {
          res.redirect("/");
          return;
        }

        res.render("productdetails", {
          title: "Product Details",
          product: product[0],
          user: req.session.user,
        });
      } catch (err) {
        next(err);
      }
    },
   

userAccount: async (req, res, next) => {
  const userId = new mongoose.Types.ObjectId(req.session.userID);
  
  try {
    const userdetails = await User.aggregate([
      {
        $match: { _id:userId }
      },
      
    ]);

    if (userdetails.length === 0) {
      res.redirect("/");
      return;
    }

    res.render("useraccount", {
      title: "User Account",
      userdetails: userdetails[0], 
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
},

geteditUserAccountPage: async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.session.userID);

    const userdetails = await User.aggregate([
      {
        $match: { _id: userId }
      }
    ]);

    if (userdetails.length === 0) {
      res.redirect("/");
      return;
    }

    res.render("edituseraccount", {
      title: "Edit User Account",
      userdetails: userdetails[0],
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
},


    posteditUserAccount: async (req, res,next) => {
      try {
        const userId = req.session.userID;
        const {
          name,
          phone,
          existingpassword,
          newpassword,
          confirmpassword,
        } = req.body;

        const user = await User.findById(userId);

        if (existingpassword) {
          const passwordMatch = await bcrypt.compare(
            existingpassword,
            user.password
          );

          if (!passwordMatch) {
            return res.render("edituseraccount", {
              title: " Edit User Account",
              alert: "Incorrect existing password",
              userdetails: user,
              user: req.session.user,
              error: "Incorrect existing password",
            });
          }
          if (!newpassword) {
            return res.render("edituseraccount", {
              title: " Edit User Account",
              alert: "Enter new password",
              userdetails: user,
              user: req.session.user,
              error: "Enter new password",
            });
          }
          if (!confirmpassword) {
            return res.render("edituseraccount", {
              title: " Edit User Account",
              alert: "Confirm password",
              userdetails: user,
              user: req.session.user,
              error: "Confirm password",
            });
          }

          if (newpassword !== confirmpassword) {
            return res.render("edituseraccount", {
              title: " Edit User Account",
              alert: "New password and confirm password do not match",
              userdetails: user,
              user: req.session.user,
              error: "New password and confirm password do not match",
            });
          }

          const hashedPassword = await bcrypt.hash(newpassword, saltPassword);

          user.name = name;
          user.phone = phone;
          user.password = hashedPassword;

          await user.save();
        } else {
          user.name = name;
          user.phone = phone;
          await user.save();
        }

        res.redirect("/useraccount");
      } catch (err) {
        next(err);
      }
    },

    userAddress: async (req, res, next) => {
      const userId = new mongoose.Types.ObjectId(req.session.userID);
      try {
        const addresses = await Address.aggregate([
          {
            $match: { userID: userId }
          }
         
        ]);
    
        res.render("useraddress", { title: "User Address", addresses, user: req.session.user });
      } catch (err) {
        next(err);
      }
    },
    

    addAddressPage: (req, res,next) => {
      try {
        const checkout = req.query.from
        const totalPrice = req.query.totalPrice
        console.log(totalPrice);
        if(checkout){
          res.render("addaddress", {
            title: "Add Address",
            user: req.session.user,
            checkout: checkout,
            totalPrice:totalPrice
          });
        }else{
          res.render("addaddress", {
            title: "Add Address",
            user: req.session.user,
            checkout:"address"
          });
        }
      
      } catch (err) {
        next(err);
      }
    },

    addAddress: async (req, res,next) => {
      try {
        const userId = req.session.userID;
        const checkout = req.body.checkout
        const totalPrice = req.body.totalPrice
        

        const { addressLine1, addressLine2, city, state, postalCode, country } =
          req.body;

        const newAddress = {
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
        };

        let userAddress = await Address.findOne({ userID: userId });

        if (!userAddress) {
          userAddress = new Address({ userID: userId, addresses: [] });
        }

        userAddress.addresses.push(newAddress);

        await userAddress.save();

        if (checkout == "checkout") {
          res.redirect(`/checkout?totalPrice=${totalPrice}`);
        } else {
          res.redirect('/useraddress');
        }
    
      } catch (err) {
        next(err);
      }
    },
    setDefaultAddress: async (req, res,next) => {
      try {
        const userId = req.session.userID;
        const addressId = req.body.addressId;

        let userAddress = await Address.findOne({ userID: userId });

        if (!userAddress) {
          console.log("User details not found");
          res
            .status(404)
            .json({ success: false, message: "User details not found" });
          return;
        }

        userAddress.addresses.forEach((address) => {
          address.isDefault = address._id.toString() === addressId;
        });

        await userAddress.save();

        res.json({
          success: true,
          message: "Default address updated successfully",
        });
      } catch (err) {
        next(err);
      }
    },

    editAddressPage: async (req, res,next) => {
      const addressId = req.params.addressId;
      try {
        const userId = req.session.userID;
        const userAddress = await Address.findOne({ userID: userId });

        if (!userAddress) {
          console.log("User details not found");
          return res.status(404).send("User details not found");
        }

        const address = userAddress.addresses.find(
          (addr) => addr._id.toString() === addressId
        );

        if (!address) {
          console.log("Address not found");
          return res.status(404).send("Address not found");
        }

        res.render("edituseraddress", { title: "Edit User Address",address, user: req.session.user });
      } catch (err) {
        next(err);
      }
    },

    posteditAddress: async (req, res,next) => {
      const addressId = req.params.addressId;
      try {
        const { addressLine1, addressLine2, city, state, postalCode, country } =
          req.body;

        const userAddress = await Address.findOne({ "addresses._id": addressId });

        if (!userAddress) {
          console.log("User details not found");
          return res.status(404).send("User details not found");
        }

        const addressToUpdate = userAddress.addresses.find(
          (addr) => addr._id.toString() === addressId
        );

        if (!addressToUpdate) {
          console.log("Address not found");
          return res.status(404).send("Address not found");
        }

        addressToUpdate.addressLine1 = addressLine1;
        addressToUpdate.addressLine2 = addressLine2;
        addressToUpdate.city = city;
        addressToUpdate.state = state;
        addressToUpdate.postalCode = postalCode;
        addressToUpdate.country = country;

        await userAddress.save();

        res.redirect("/useraddress");
      } catch (err) {
        next(err);
      }
    },
    deleteAddress:async (req, res, next) => {
      const addressId = req.params.addressId;
      try {
          const userId = req.session.userID;

          
          let userAddress = await Address.findOne({ userID: userId });

          if (!userAddress) {
              return res.status(404).send("User details not found");
          }

        
          userAddress.addresses = userAddress.addresses.filter(address => address._id.toString() !== addressId);

          
          await userAddress.save();

        
          res.redirect('/useraddress');
      } catch (err) {
          next(err);
      }
  },

  userOrders: async (req, res, next) => {
    try {
      const userId = new mongoose.Types.ObjectId(req.session.userID); 
      const orders = await Order.aggregate([
        { $match: { userID: userId } },
        { $sort: { orderDate: -1 } },
      ]);
      res.render("userorders", { orders, user: req.session.user });
    } catch (err) {
      next(err);
    }
  },

  
  userOrderCancel: async (req, res, next) => {
    const orderId = req.params.orderId;
  
    try {
      const order = await Order.findById(orderId);
       if (order.paymentStatus === 'Paid') {
      const wallet = await Wallet.findOne({ userId: order.userID });

      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found for user' });
      }

      wallet.balance += order.totalPrice;
      
      await wallet.save();
    }
  
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
  
      order.status = "Cancelled";
      await order.save();
  
      return res.status(200).redirect("/userorders");
    } catch (err) {
      next(err);
    }
  },
  
    userOrderDetails: async (req, res,next) => {
      try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
          .populate("items.product")
          .exec();

        if (!order) {
          res.status(404).send("Order not found");
          return;
        }
        let progressPercentage = 0;
        switch (order.status) {
          case "Pending":
            progressPercentage = 33;
            progressColor = "#FED000";
            break;
          case "Shipped":
            progressPercentage = 66;
            progressColor = "	#2AAA8A";
            break;
          case "Delivered":
            progressPercentage = 100;
            progressColor = "#008080";
            break;
          case "Cancelled":
            progressPercentage = 100;
            progressColor = "#8B0000";
            break;
          default:
            progressPercentage = 0;
            break;
        }

        res.render("userorderdetails", {
          title: "User Order Details",
          order,
          progressPercentage,
          user: req.session.user,
        });
      } catch (err) {
        next(err);
      }
    },

    checkoutPage: async (req, res, next) => {
      try {
        const userId = req.session.userID;
        const queryTotalPrice = parseInt(req.query.totalPrice); 
        const orderId = req.query.orderId
        const addresses = await Address.findOne({ userID: userId });

        let defaultAddress = null;
        if (addresses && addresses.addresses && addresses.addresses.length > 0) {
          defaultAddress = addresses.addresses.find(
            (address) => address.isDefault
          );
        }

        const userCart = await Cart.findOne({ userID: userId })
          .populate("items.product")
          .exec();
          const totalPrice = queryTotalPrice;

        res.render("checkout", {
          title: "Checkout",
          addresses: addresses,
          user: req.session.user,
          userAddress: defaultAddress,
          cartItems: userCart.items,
          totalPrice: totalPrice,
          orderId:orderId,
         
        });
      } catch (err) {
        next(err);
      }
    },

    placeOrder: async (req, res, next) => {
      try {
        const { orderId, addressID, totalPrice, paymentMethod, paymentStatus } = req.body;
    
        if (orderId) {
          const orderToUpdate = await Order.findById(orderId);
    
          if (!orderToUpdate) {
            return res.status(404).json({ message: "Order not found" });
          }
    
          orderToUpdate.totalPrice = totalPrice;
          orderToUpdate.paymentMethod = paymentMethod;
          orderToUpdate.paymentStatus = paymentStatus;
    
          if (paymentStatus === "Paid" || paymentStatus === "Pending") {
            await orderToUpdate.save();
            return res.status(200).render("thankyou",{orderId});
          } else if (paymentStatus === "Failed") {
            await orderToUpdate.save();
            return res.status(200).redirect("/userorders");
          }
        }
    
        const cartItems = Array.from(JSON.parse(req.body.cartItems));
        const address = await Address.findOne({ "addresses._id": addressID });
        const selectedAddress = address.addresses.find((a) => addressID.includes(a._id.toString()));
        const user = await User.findById(req.session.userID);
    
        const order = new Order({
          userID: user._id,
          items: cartItems.map((item) => ({
            product: item.product,
            price: item.price,
            quantity: item.quantity,
          })),
          totalPrice,
          billingDetails: {
            name: user.name,
            addressLine1: selectedAddress.addressLine1,
            addressLine2: selectedAddress.addressLine2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            country: selectedAddress.country,
            postalCode: selectedAddress.postalCode,
            phone: user.phone,
            email: user.email,
          },
          paymentMethod,
          paymentStatus,
        });
    
        await order.save();
    
        await Cart.findOneAndUpdate(
          { userID: user._id },
          { $set: { items: [], totalPrice: 0 } }
        );
    
        if (paymentStatus === "Paid" || paymentStatus === "Pending") {
          return res.status(200).render("thankyou", { orderId: order._id.toString() });

        } else if (paymentStatus === "Failed") {
          return res.status(200).redirect("/userorders");
        }
      } catch (err) {
        next(err);
      }
    },

    downloadInvoice: async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        
        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }
        
        // Prepare the invoice data
        const productsData = await Promise.all(order.items.map(async item => {
          const product = await Product.findById(item.product);
          if (!product) {
            throw new Error(`Product not found for ID: ${item.product}`);
          }
          return {
            "quantity": item.quantity,
            "description": product.productTitle,
            "tax": 0,
            "price": item.price * item.quantity
          };
        }));
        
        const data = {
          "currency": "INR",
          "taxNotation": "vat",
          "marginTop": 25,
          "marginRight": 25,
          "marginLeft": 25,
          "marginBottom": 25,
          "logo": "https://public.easyinvoice.cloud/img/logo_en_original.png",
          "sender": {
            "company": "Sample Company",
            "address": "Sample Street 123",
            "zip": "1234 AB",
            "city": "Sampletown",
            "country": "Samplecountry"
          },
          "client": {
            "company": order.billingDetails.name,
            "address": `${order.billingDetails.addressLine1}, ${order.billingDetails.addressLine2}`,
            "zip": order.billingDetails.postalCode,
            "city": order.billingDetails.city,
            "country": order.billingDetails.country
          },
          "invoiceNumber": order.trackingId,
          "invoiceDate": order.orderDate.toISOString(),
          "products": productsData,
          "total": order.totalPrice+100, 
          "bottomNotice": `Total: ${order.totalPrice} INR`,
        };
        
        const result = await easyinvoice.createInvoice(data);
        
        const invoicesDir = path.join(__dirname, '..', 'invoices');
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir);
        }
        
        const filePath = path.join(invoicesDir, `invoice_${orderId}.pdf`);
        fs.writeFileSync(filePath, result.pdf, 'base64');
        
        // Send the file as a response
        res.download(filePath, `invoice_${orderId}.pdf`);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate invoice' });
      }
    },
    
    
    razorpayCheckout:async(req, res) => {
      try {
        const userId = req.session.userID;

        const addresses = await Address.findOne({ userID: userId });

        let defaultAddress = null;
        if (addresses && addresses.addresses && addresses.addresses.length > 0) {
          defaultAddress = addresses.addresses.find(
            (address) => address.isDefault
          );
        }

        const userCart = await Cart.findOne({ userID: userId })
          .populate("items.product")
          .exec();

        res.render("razorpaycheckout", {
          title: "Razorpay Checkout",
          addresses: addresses,
          user: req.session.user,
          userAddress: defaultAddress,
          cartItems: userCart.items,
          totalPrice: userCart.totalPrice,
        });
      } catch (err) {
        next(err);
      }
    
  },

    thankYou: (req, res,next) => {
      try {
        res.render("thankyou",{title:"Thank You"});
      } catch (err) {
        next(err);
      }
    },

    logout: (req, res,next) => {
      try {
        req.session.user = null;
        req.session.isLogged = false;

        res.render("userlogin", {
          title: "Login",
          logout: "Logout Successfully",
        });
      } catch (err) {
        next(err);
      }
    },
  };
  module.exports = userController;
