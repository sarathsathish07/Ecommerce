const express = require("express");
const admin_router = express.Router();
const nocache = require("nocache");
const isAdmin = require('../middleware/adminauth')
const isLoggedAdmin = require('../middleware/adminlogged')
const adminController = require("../controller/adminController");
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController");
const dashController = require("../controller/dashboardController");

admin_router.use(nocache());
  
admin_router.get("/adminlogin",isLoggedAdmin, adminController.getAdminLogin);
admin_router.post("/submit", adminController.postAdminLogin);

admin_router.get("/dashboard",isAdmin, dashController.getDashboard);
admin_router.get("/fetchdashboard",isAdmin, dashController.fetchDashboard);

admin_router.get("/userlist",isAdmin, adminController.getUsers);
admin_router.get("/userlist/:page",isAdmin,adminController.getUsersPagination);

admin_router.get("/productlist",isAdmin, productController.getProducts);
admin_router.get("/productlist/:page",isAdmin, productController.getProductsPagination);
admin_router.get("/addproducts", isAdmin,productController.getAddProducts);
admin_router.post("/addproducts",isAdmin, productController.postAddProducts);
admin_router.get("/editproduct/:id",isAdmin, productController.getEditProducts);
admin_router.post("/updateproduct/:id",isAdmin, productController.postEditProducts);

admin_router.get("/categories",isAdmin, categoryController.getCategories);
admin_router.get("/categories/:page",isAdmin, categoryController.getCategoryPagination);
admin_router.get("/addcategories",isAdmin, categoryController.getAddCategories);
admin_router.post("/addcategories",isAdmin, categoryController.postAddCategories);
admin_router.get("/edit/:id",isAdmin, categoryController.getEditCategories);
admin_router.post("/update/:id",isAdmin, categoryController.postEditCategories);

admin_router.get("/block/:userId", isAdmin,adminController.blockUser);
admin_router.get("/unblock/:userId",isAdmin, adminController.unblockUser);

admin_router.get("/list/:categoryId",isAdmin, categoryController.listCategory);
admin_router.get("/unlist/:categoryId",isAdmin, categoryController.unlistCategory);

admin_router.get("/unpublish/:id",isAdmin, productController.unpublishProduct);
admin_router.get("/publish/:id",isAdmin, productController.publishProduct);

admin_router.get("/orders",isAdmin, adminController.getOrders);
admin_router.get("/orders/:page",isAdmin, adminController.getOrdersPagination);
admin_router.get("/orderdetails/:id",isAdmin, adminController.getOrderDetailsPage);

admin_router.post("/updateStatus",isAdmin, adminController.updateStatus);

admin_router.post('/generate-report',isAdmin,adminController.generateReport)
admin_router.get('/report',isAdmin,adminController.report)

admin_router.get("/adminlogout",isAdmin, adminController.getAdminLogout);

module.exports = admin_router;
