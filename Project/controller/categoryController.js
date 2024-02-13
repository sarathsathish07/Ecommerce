const User = require("../models/users");
const Category = require("../models/category");

const categoryController = {
  getCategories: async (req, res,next) => {
    try {
      const perPage = 5;
      const page = req.query.page || 1;

      const totalProducts = await Category.countDocuments();

      const categories = await Category.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const totalPages = Math.ceil(totalProducts / perPage);

      res.render("admin/categories", {
        title: "Categories",
        categories: categories,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },

  getAddCategories: (req, res,next) => {
    try {
      res.render("admin/addcategories", { title: "Add Category" });
    } catch (err) {
      next(err);
    }
  },
  postAddCategories: async (req, res,next) => {
    try {
      const categoryName = req.body.category.toLowerCase();

       const existingCategory = await Category.findOne({ category: { $regex: new RegExp('^' + categoryName + '$', 'i') } });
      if (existingCategory) {
        res.render("admin/addcategories", {
          title: "Add Category",
          alert: "Category already exists",
        });
      } else {
        const category = new Category({
          category: req.body.category,
          description: req.body.description,
        });

        await category.save();
        req.session.message = {
          type: "success",
          message: "Category added successfully",
        };
        res.redirect("/categories");
      }
    } catch (err) {
      next(err);
    }
  },

  getEditCategories: async (req, res,next) => {
    try {
      const id = req.params.id;
      const category = await Category.findById(id).exec();

      if (!category) {
        res.redirect("/categories");
        return;
      }

      res.render("admin/editcategories", {
        title: "Edit Category",
        category: category,
      });
    } catch (err) {
      next(err);
    }
  },
  postEditCategories: async (req, res,next) => {
    try {
      const id = req.params.id;
      const newCategoryName = req.body.category.toLowerCase();
      const category = await Category.findById(id).exec();
   
    const existingCategory = await Category.findOne({ category: { $regex: new RegExp('^' + newCategoryName + '$', 'i') }, _id: { $ne: id } });
    if (existingCategory) {
      res.render("admin/editcategories", {
        title: "Add Category",
        alert: "Category already exists",
        category: category
      });
    } else {
    await Category.findByIdAndUpdate(id, {
        category: req.body.category,
        description: req.body.description,
      }).exec();


      req.session.message = {
        type: "success",
        message: "Category updated successfully",
      };
      res.redirect("/categories");
    } 
  }catch (err) {
      next(err);
    }
  },
  listCategory: async (req, res,next) => {
    try {
      const categoryId = req.params.categoryId;
      await Category.findByIdAndUpdate(categoryId, { isListed: true });
      res.redirect("/categories");
    } catch (err) {
      next(err);
    }
  },
  unlistCategory: async (req, res,next) => {
    try {
      const categoryId = req.params.categoryId;
      console.log(categoryId);

      await Category.findByIdAndUpdate(categoryId, { isListed: false });

      res.redirect("/categories");
    } catch (err) {
      next(err);
    }
  },


  getCategoryPagination: async (req, res,next) => {
    try {
      const perPage = 5;
      const page = req.query.page || 1;

      const totalCategories = await Category.countDocuments();

      const categories = await Category.find()
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const totalPages = Math.ceil(totalCategories / perPage);

      res.render("admin/categories", {
        title: "Categories",
        categories: categories,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = categoryController;
