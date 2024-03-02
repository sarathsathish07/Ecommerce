const express = require("express");
const router = express.Router();
const nocache = require("nocache");
const userController = require("../controller/userController");
const cartController = require("../controller/cartController");
const walletController = require("../controller/walletController");
const couponController = require("../controller/couponController");
const isUser = require('../middleware/userauth')
const isLoggedUser = require('../middleware/userlogged')
router.use(nocache());

router.get("/", userController.getHome);

router.get("/login",isLoggedUser, userController.getLoginPage);
router.post("/login", userController.postLogin);

router.get("/usersignup", userController.getSignupPage);
router.post("/signup", userController.postSignup);

router.get("/otpverification", userController.getOTPVerificationPage);
router.post("/verifyotp", userController.postVerifyOTP);
router.post('/resendotp', userController.resendOTP);

router.get("/shop", userController.shopPage);

router.get("/productdetails/:id", userController.getProductDetailsPage);
router.get("/add-to-cart/:id",isUser, cartController.addToCart);
router.get("/check-stock/:id",isUser, cartController.checkStock);
router.get("/cart",isUser, cartController.cartPage);
router.delete("/remove-from-cart/:id",isUser, cartController.deleteCart);
router.post('/update-cart',isUser, cartController.updateCart);





router.post('/place-order',isUser, userController.placeOrder);
router.get('/downloadinvoice/:orderId',isUser,userController.downloadInvoice)

router.get('/checkout',isUser, userController.checkoutPage);
router.get('/razorpay-checkout',isUser,userController.razorpayCheckout)
router.get('/thankyou',isUser, userController.thankYou);


router.get('/editAddress/:addressId',isUser, userController.editAddressPage);
router.post('/editAddress/:addressId',isUser, userController.posteditAddress);
router.post('/deleteAddress/:addressId',isUser, userController.deleteAddress);

router.get('/useraccount',isUser,userController.userAccount)
router.post("/edituseraccount",isUser, userController.posteditUserAccount);
router.get("/edituseraccount",isUser, userController.geteditUserAccountPage);

router.get('/useraddress',isUser,userController.userAddress)
router.get('/addaddress',isUser,userController.addAddressPage)
router.post('/addaddress',isUser,userController.addAddress)
router.post('/setDefaultAddress',isUser, userController.setDefaultAddress);

router.get("/userorders",isUser, userController.userOrders);
router.get('/cancelOrder/:orderId',isUser,userController.userOrderCancel)
router.get("/userorderdetails/:orderId",isUser, userController.userOrderDetails);

router.get("/getcoupons",isUser, couponController.fetchCoupons);

router.get("/wallet",isUser, walletController.wallet);
router.post("/addAmount",isUser, walletController.addAmount);
router.get("/check-wallet-balance",isUser, walletController.checkWalletBalance);


router.get("/logout",isUser, userController.logout);




module.exports = router;
