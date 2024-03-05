const Cart = require("../models/userCart");
const Products = require("../models/products");

const cartController = {
  addToCart: async (req, res, next) => {
    try {
        const userId = req.session.userID;
        const productID = req.params.id;
        const quantity = 1;

        const product = await Products.findById(productID);
        if (!product || product.stock === 0) {
            return res.status(400).json({ success: false, message: "Product is out of stock." });
        }

        let userCart = await Cart.findOne({ userID: userId });

        if (!userCart) {
            const newCart = new Cart({
                userID: userId,
                items: [
                    {
                        product: productID,
                        price: product.price,
                        quantity: quantity,
                    },
                ],
                totalPrice: product.price * quantity,
            });

            await newCart.save();
        } else {
            const existingProduct = userCart.items.find(
                (item) => item.product.toString() === productID.toString()
            );
            

            if (existingProduct) {
                existingProduct.quantity += quantity;
            } else {
                userCart.items.push({
                    product: productID,
                    quantity: quantity,
                    price: product.price,
                });
            }

            userCart.totalPrice = userCart.items.reduce(
                (total, item) => total + item.price * item.quantity,
                0
            );

            await userCart.save();
        }
    } catch (err) {
        next(err);
    }
},

checkStock: async (req, res, next) => {
    try {
        const productID = req.params.id;
        const product = await Products.findById(productID);
        console.log(product);

        if (!product) {
            console.log("1");
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        if (req.session.user == null) {
            console.log("No user logged in");
            return res.status(200).json({ success: false, message: "Please log in to add items to your cart." });
        }

        const userCart = await Cart.findOne({ userID: req.session.userID }).populate('items.product');

        if (!userCart) {
            console.log("2");
            return res.status(200).json({ success: true, message: "Product is in stock." });
        }

        console.log("User Cart:", userCart);

        const cartItem = userCart.items.find((item) => item.product._id.toString() === productID.toString());

        console.log("Cart Item:", cartItem);

        if (!cartItem) {
            console.log("3");
            return res.status(200).json({ success: true, message: "Product is in stock." });
        }

        const maxQuantity = product.stock;
        const currentQuantity = cartItem.quantity;
        console.log("Max Quantity:", maxQuantity);
        console.log("Current Quantity:", currentQuantity);

        if (currentQuantity >= maxQuantity) {
            return res.status(200).json({ success: false, message: "Maximum quantity reached for this product." });
        }

        return res.status(200).json({ success: true, message: "Product is in stock." });
    } catch (err) {
        next(err);
    }
},



cartPage: async (req, res, next) => {
  try {
      const userId = req.session.userID;

      const userCart = await Cart.findOne({ userID: userId }).populate({
          path: "items.product",
          model: "Product",
      });

      res.status(200).render("addcart", { title: "Cart", userCart, user: req.session.user });
  } catch (err) {
      next(err);
  }
},

updateCart: async (req, res, next) => {
  try {
      const userId = req.session.userID;
      const productId = req.body.productId;
      const action = req.body.action;

      let userCart = await Cart.findOne({ userID: userId }).populate('items.product');

      if (userCart) {
          const cartItem = userCart.items.find(
              (item) => item.product._id.toString() === productId.toString()
          );

          if (cartItem) {
              const product = await Products.findById(productId);
              const maxQuantity = product.stock;

              if (action === "increment") {
                  if (cartItem.quantity < maxQuantity) {
                      cartItem.quantity += 1;
                      cartItem.price = cartItem.product.price;

                      userCart.totalPrice = userCart.items.reduce(
                          (total, item) => total + item.price * item.quantity,
                          0
                      );
                      await userCart.save();

                      return res.json({
                          success: true,
                          cartItem,
                          totalPrice: userCart.totalPrice,
                      });
                  } else {
                      return res.json({
                          success: false,
                          message: "Maximum quantity reached for this product",
                      });
                  }
              } else if (action === "decrement" && cartItem.quantity > 1) {
                  cartItem.quantity -= 1;
                  cartItem.price = cartItem.product.price;

                  userCart.totalPrice = userCart.items.reduce(
                      (total, item) => total + item.price * item.quantity,
                      0
                  );
                  await userCart.save();

                  return res.json({
                      success: true,
                      cartItem,
                      totalPrice: userCart.totalPrice,
                  });
              } else {
                  return res.json({
                      success: false,
                      message: "Invalid action or quantity",
                  });
              }
          } else {
              return res.json({
                  success: false,
                  message: "Product not found in the cart",
              });
          }
      } else {
          return res.json({ success: false, message: "User cart not found" });
      }
  } catch (err) {
      next(err);
  }
},




deleteCart: async (req, res) => {
  try {
      const userId = req.session.userID;
      const productId = req.params.id;

      let userCart = await Cart.findOne({ userID: userId });

      if (userCart) {
          const productInCartIndex = userCart.items.findIndex(item => item.product.toString() === productId);
          
          if (productInCartIndex !== -1) {
              userCart.items.splice(productInCartIndex, 1);
              userCart.totalPrice = userCart.items.reduce((total, item) => total + item.price * item.quantity, 0);
              await userCart.save();

              res.json({ success: true });
          } else {
              res.json({ success: false, message: 'Product not found in the cart' });
          }
      } else {
          res.json({ success: false, message: 'User cart not found' });
      }
  } catch (error) {
      console.error('Error deleting product from cart:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
};

module.exports = cartController;
