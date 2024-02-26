const Coupon = require('../models/coupons')

const couponController = {

  getCoupons: async (req, res, next) => {
    try {
      const perPage = 5;
      const page = req.query.page || 1;
  
      const totalProducts = await Coupon.aggregate([
        { $count: "totalCoupons" }
      ]);
  
      const totalCoupons = totalProducts.length > 0 ? totalProducts[0].totalCoupons : 0;
  
      const coupons = await Coupon.aggregate([
        { $skip: perPage * page - perPage },
        { $limit: perPage }
      ]);
  
      const totalPages = Math.ceil(totalCoupons / perPage);
  
      res.render("admin/coupons", {
        title: "Coupons",
        coupons: coupons,
        totalPages: totalPages,
        currentPage: page,
        perPage: perPage,
      });
    } catch (err) {
      next(err);
    }
  },
  getAddCoupons: (req, res,next) => {
    try {
      res.render("admin/addcoupons", { title: "Add Coupons" });
    } catch (err) {
      next(err);
    }
  },
  postAddCoupons: async (req, res) => {
    try {
        const { couponCode, description, discountPercentage, maxDiscountAmount, minAmount, expiry_date } = req.body;

        const existingCoupon = await Coupon.findOne({ couponCode });

        if (existingCoupon) {
            return res.status(400).json({ error: 'Coupon code already exists' });
        }

        const newCoupon = new Coupon({
            couponCode,
            description,
            discountPercentage,
            maxDiscountAmount,
            minAmount,
            expiryDate
        });

        await newCoupon.save();

        res.redirect('/coupons');
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
},

  getEditCoupons: async (req, res,next) => {
    try {
      const id = req.params.id;
      const coupon = await Coupon.findById(id).exec();

      if (!coupon) {
        res.redirect("/coupons");
        return;
      }

      res.render("admin/editcoupons", {
        title: "Edit Category",
        coupon: coupon,
      });
    } catch (err) {
      next(err);
    }
  },
  postEditCoupons: async (req, res,next) => {
    try {
      const id = req.params.id;
  
    await Coupon.findByIdAndUpdate(id, {
      couponCode: req.body.couponCode,
        description: req.body.description,
        discountPercentage: req.body.discountPercentage,
        maxDiscountAmount: req.body.maxDiscountAmount,
        minAmount: req.body.minAmount,
        expiryDate: req.body.expiry_date
      }).exec();

      req.session.message = {
        type: "success",
        message: "Coupon updated successfully",
      };
      res.redirect("/coupons");
    
  }catch (err) {
      next(err);
    }
  },

  fetchCoupons: async (req, res) => {
    try {
        const cartTotalPrice = req.query.totalPrice;
        const currentDate = new Date();
        const coupons = await Coupon.find({  
            minAmount: { $lte: cartTotalPrice },
            isListed: true,
            expiryDate:{ $gte: currentDate}
        });

        res.json({ coupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
},

listCoupon: async (req, res,next) => {
  try {
    const couponId = req.params.couponId;
    await Coupon.findByIdAndUpdate(couponId, { isListed: true });
    res.redirect("/coupons");
  } catch (err) {
    next(err);
  }
},
unlistCoupon: async (req, res,next) => {
  try {
    const couponId = req.params.couponId;

    await Coupon.findByIdAndUpdate(couponId, { isListed: false });

    res.redirect("/coupons");
  } catch (err) {
    next(err);
  }
},

}

module.exports = couponController;