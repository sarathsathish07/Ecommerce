const Brand = require('../models/brands')



const brandController = {
  getBrands: async (req, res, next) => {
    try {
      const perPage = 5;
      const page = req.query.page || 1;
  
      const totalProducts = await Brand.aggregate([
        { $count: "totalBrands" }
      ]);
  
      const totalBrands = totalProducts.length > 0 ? totalProducts[0].totalBrands : 0;
  
      const brands = await Brand.aggregate([
        { $skip: perPage * page - perPage },
        { $limit: perPage }
      ]);
  
      const totalPages = Math.ceil(totalBrands / perPage);
  
      res.render("admin/brands", {
        title: "Brands",
        brands: brands,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },
  getAddBrands: (req, res,next) => {
    try {
      res.render("admin/addbrands", { title: "Add Brands" });
    } catch (err) {
      next(err);
    }
  },
  postAddBrands: async (req, res,next) => {
    try {
      const brandName = req.body.brand.toLowerCase();

       const existingBrand = await Brand.findOne({ brand: { $regex: new RegExp('^' + brandName + '$', 'i') } });
      if (existingBrand) {
        res.render("admin/addbrands", {
          title: "Add Brands",
          alert: "Brand already exists",
        });
      } else {
        const brand = new Brand({
          brand: req.body.brand,
          description: req.body.description,
        });

        await brand.save();
        req.session.message = {
          type: "success",
          message: "Brand added successfully",
        };
        res.redirect("/brands");
      }
    } catch (err) {
      next(err);
    }
  },

  listBrand: async (req, res,next) => {
    try {
      const brandId = req.params.brandId;
      await Brand.findByIdAndUpdate(brandId, { isListed: true });
      res.redirect("/brands");
    } catch (err) {
      next(err);
    }
  },
  getEditBrands: async (req, res,next) => {
    try {
      const id = req.params.id;
      const brand = await Brand.findById(id).exec();

      if (!brand) {
        res.redirect("/brands");
        return;
      }

      res.render("admin/editbrands", {
        title: "Edit Brand",
        brand: brand,
      });
    } catch (err) {
      next(err);
    }
  },
  postEditBrands: async (req, res,next) => {
    try {
      const id = req.params.id;
      const newBrandName = req.body.brand.toLowerCase();
      const brand = await Brand.findById(id).exec();
   
    const existingBrand = await Brand.findOne({ brand: { $regex: new RegExp('^' + newBrandName + '$', 'i') }, _id: { $ne: id } });
    if (existingBrand) {
      res.render("admin/editbrands", {
        title: "Edit Brand",
        alert: "Brand already exists",
        brand: brand
      });
    } else {
    await Brand.findByIdAndUpdate(id, {
      brand: req.body.brand,
        description: req.body.description,
      }).exec();


      req.session.message = {
        type: "success",
        message: "Brand updated successfully",
      };
      res.redirect("/brands");
    } 
  }catch (err) {
      next(err);
    }
  },
  unlistBrand: async (req, res,next) => {
    try {
      const brandId = req.params.brandId;

      await Brand.findByIdAndUpdate(brandId, { isListed: false });

      res.redirect("/brands");
    } catch (err) {
      next(err);
    }
  },
  getBrandPagination: async (req, res, next) => {
    try {
      const perPage = 5;
      const page = parseInt(req.query.page) || 1;
  
      const totalBrands = await Brand.aggregate([
        { $count: "totalBrands" }
      ]);
  
      const totalCount = totalBrands.length > 0 ? totalBrands[0].totalBrands : 0;
  
      const result = await Brand.aggregate([
        { $skip: perPage * page - perPage },
        { $limit: perPage }
      ]);
  
      const totalPages = Math.ceil(totalCount / perPage);
  
      res.render("admin/brands", {
        title: "Brands",
        brands: result,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },
}

module.exports = brandController;
