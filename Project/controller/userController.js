const User = require("../models/users");
const Product = require("../models/products");
const Cart = require("../models/userCart");
const Order = require("../models/orders");
const Address = require("../models/address");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");
const saltPassword = 10;

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "sarathsathish77@gmail.com",
    pass: "pehs ltsj iktw pqtp",
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
      const products = await Product.find({ isPublished: true }).populate(
        "category"
      );

      const filteredProducts = products.filter(
        (product) => product.category.isListed
      );

      res.render("home", {
        title: "Home",
        user: req.session.user,
        products: filteredProducts,
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
        from: "sarathsathish77@gmail.com",
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

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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

       

        const products1 = await Product.find({ isPublished: true }).populate("category");

        const filteredProducts = products1.filter(
            (product) => product.category.isListed
        );

        const startIndex = perPage * (page - 1);
        const endIndex = startIndex + perPage;
        const products = filteredProducts.slice(startIndex, endIndex);

        const totalPages = Math.ceil(filteredProducts.length / perPage);

        res.render("shop", {
            title: "Shop",
            products: products,
            totalPages: totalPages,
            currentPage: page,
            perPage: perPage,
            user:req.session.user
        });
    } catch (err) {
        next(err);
    }
},

  getShopPagination: async (req, res, next) => {
    try {
        const perPage = 9;
        const page = req.query.page || 1;

       

        const products1 = await Product.find({ isPublished: true }).populate("category");

        const filteredProducts = products1.filter(
            (product) => product.category.isListed
        );

        const startIndex = perPage * (page - 1);
        const endIndex = startIndex + perPage;
        const products = filteredProducts.slice(startIndex, endIndex);

        const totalPages = Math.ceil(filteredProducts.length / perPage);

        res.render("shop", {
            title: "Shop",
            products: products,
            totalPages: totalPages,
            currentPage: page,
            perPage: perPage,
            user:req.session.user
        });
    } catch (err) {
      next(err);
    }
  },

  getProductDetailsPage: async (req, res,next) => {
    try {
      const id = req.params.id;
      console.log();
      const product = await Product.findById(id).exec();

      if (!product) {
        res.redirect("/");
        return;
      }

      res.render("productdetails", {
        title: "Product Details",
        product: product,
        user: req.session.user,
      });
    } catch (err) {
      next(err);
    }
  },
  userAccount: async (req, res,next) => {
    const userId = req.session.userID;
    try {
      const userdetails = await User.findOne({ _id: userId });

     

  
      res.render("useraccount", {title: "User Account", userdetails, user: req.session.user });
    } catch (err) {
      next(err);
    }
  },
  geteditUserAccountPage: async (req, res,next) => {
    try {
      const userId = req.session.userID;

      const userdetails = await User.findOne({ _id: userId });

      res.render("edituseraccount", {title: " Edit User Account", userdetails, user: req.session.user });
    } catch (error) {
      next(err);
    }
  },

  posteditUserAccount: async (req, res,next) => {
    try {
      const userId = req.session.userID;
      const {
        name,
        email,
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
        user.email = email;
        user.phone = phone;
        user.password = hashedPassword;

        await user.save();
      } else {
        user.name = name;
        user.email = email;
        user.phone = phone;
        await user.save();
      }

      res.redirect("/useraccount");
    } catch (err) {
      next(err);
    }
  },

  userAddress: async (req, res,next) => {
    const userId = req.session.userID;
    try {
      const addresses = await Address.find({ userID: userId });
      console.log(addresses);

      res.render("useraddress", { title: "User Address",addresses, user: req.session.user });
    } catch (err) {
      next(err);
    }
  },

  addAddressPage: (req, res,next) => {
    try {
      res.render("addaddress", {
        title: "Add Address",
        user: req.session.user,
      });
    } catch (err) {
      next(err);
    }
  },

  addAddress: async (req, res,next) => {
    try {
      const userId = req.session.userID;

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

      res.redirect("/useraddress");
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

  userOrders: async (req, res,next) => {
    try {
      const orders = await Order.find();
      res.render("userorders", { orders, user: req.session.user });
    } catch (err) {
      next(err);
    }
  },

  userOrderCancel: async (req, res,next) => {
    const orderId = req.params.orderId;

    try {
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
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
      console.log(order.status);

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

      res.render("checkout", {
        title: "Checkout",
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

  placeOrder: async (req, res,next) => {
    try {
      const { addressID, totalPrice } = req.body;

      const cartItems = Array.from(JSON.parse(req.body.cartItems));

      const address = await Address.findOne({ "addresses._id": addressID });

      const selectedAddress = address.addresses.find((a) =>
        addressID.includes(a._id.toString())
      );
      console.log("Selected address:", selectedAddress);

      const user = await User.findById(address.userID);

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
        paymentMethod: "Cash on Delivery",
      });

      await order.save();

      await Cart.findOneAndUpdate(
        { userID: user._id },
        { $set: { items: [], totalPrice: 0 } }
      );

      res.status(200).render("thankyou", {title: "Thank You", user: req.session.user });
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
