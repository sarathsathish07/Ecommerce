const Product = require("../models/products");
const Category = require("../models/category");
const sharp = require("sharp");
const fs = require('fs')
const multer = require("multer");

const storage = multer.diskStorage({
  destination: "public/img/",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

const productController = {
  getProducts: async (req, res, next) => {
    try {
      const perPage = 2;
      const page = req.query.page || 1;

      const totalProducts = await Product.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 }
          }
        }
      ]);

      const totalProductsCount = totalProducts.length > 0 ? totalProducts[0].count : 0;

      const products = await Product.aggregate([
        {
          $skip: perPage * page - perPage
        },
        {
          $limit: perPage
        },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category"
          }
        },
        {
          $unwind: "$category"
        }
      ]);

      const totalPages = Math.ceil(totalProductsCount / perPage);

      res.render("admin/productlist", {
        title: "Products",
        products: products,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  getProductsPagination: async (req, res, next) => {
    try {
      const perPage = 2;
      const page = req.query.page || 1;
      
      const totalProducts = await Product.aggregate([
        {
          $group: {
            _id: null,
            count: { $sum: 1 }
          }
        }
      ]);
      
      const totalProductsCount = totalProducts.length > 0 ? totalProducts[0].count : 0;
      
      const products = await Product.aggregate([
        {
          $skip: perPage * page - perPage
        },
        {
          $limit: perPage
        }
      ]);

      const totalPages = Math.ceil(totalProductsCount / perPage);

      res.render("admin/productlist", {
        title: "Products",
        products: products,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  getAddProducts: async (req, res,next) => {
    try {
      let allCategories = await Category.find();


      res.render("admin/addproduct", {title: "Add Products", categories: allCategories });
    } catch (err) {
      next(err);
    }
  },

  postAddProducts: async (req, res,next) => {
    try {
      upload.array("images")(req, res, async (err) => {
        if (err) {
          return res.json({ message: err.message, type: "danger" });
        }

        const images = req.files.map((file) => `/img/${file.filename}`);
        console.log("category:", req.body.category);
        const product = new Product({
          productTitle: req.body.producttitle,
          description: req.body.description,
          category: req.body.category,
          price: req.body.price,
          stock: req.body.stock,
          images: images,
          isBestSeller: req.body.isBestSeller === "on",
          isNewArrival: req.body.isNewArrival === "on",
          isHotSale: req.body.isHotSale === "on",
        });

        await product.save();
        res.redirect("/productlist");
      });
    } catch (err) {
      next(err);
    }
  },
  
  unpublishProduct: async (req, res,next) => {
    try {
      const id = req.params.id;
      await Product.findByIdAndUpdate(id, { isPublished: false });

      res.redirect("/productlist");
    } catch (err) {
      next(err);
    }
  },

  publishProduct: async (req, res,next) => {
    try {
      const id = req.params.id;

      await Product.findByIdAndUpdate(id, { isPublished: true });

      res.redirect("/productlist");
    } catch (err) {
      next(err);
    }
  },

  getEditProducts: async (req, res,next) => {
    try {
      const id = req.params.id;
      const product = await Product.findById(id).exec();

      if (!product) {
        res.redirect("/productlist");
        return;
      }
      const allCategories = await Category.find();

      

      res.render("admin/editproducts", {
        title: "Edit Products",
        product: product,
        categories: allCategories,
      });
    } catch (err) {
      next(err);
    }
  },
  postEditProducts: async (req, res, next) => {
    try {
      const id = req.params.id;
  
      upload.array("images")(req, res, async (err) => {
        if (err) {
          return res.json({ message: err.message, type: "danger" });
        }
  
        const existingProduct = await Product.findById(id).exec();
        if (!existingProduct) {
          return res.json({ message: "Product not found", type: "danger" });
        }
        const existingImages = req.body.existingImages || [];
        const unchangedImages = new Array(existingImages.length);

        existingImages.forEach((image, index) => {
          if (!req.body.replacedImageIndex.includes(index.toString())) {
            unchangedImages[index] = image;
          }
        });
        
        const newImages = req.files.map((file) => `/img/${file.filename}`);

        newImages.forEach((image) => {
          const emptyIndex = unchangedImages.findIndex((value) => !value);
          if (emptyIndex !== -1) {
            unchangedImages[emptyIndex] = image;
          }
        });
  
        
        let updateData = {
          productTitle: req.body.producttitle,
          description: req.body.description,
          category: req.body.category,
          price: req.body.price,
          stock: req.body.stock,
          isBestSeller: req.body.isBestSeller === "on",
          isNewArrival: req.body.isNewArrival === "on",
          isHotSale: req.body.isHotSale === "on",
          images: unchangedImages, 
        };
  
        
        const result = await Product.findByIdAndUpdate(id, updateData).exec();
  
        if (!result) {
          return res.json({ message: "Product not found", type: "danger" });
        }
  
        req.session.message = {
          type: "success",
          message: "Product updated successfully",
          products: result,
        };
        res.redirect("/productlist");
      });
    } catch (err) {
      next(err);
    }
  },
  


}

module.exports = productController;
