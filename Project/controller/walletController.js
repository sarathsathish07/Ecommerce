const Wallet = require("../models/wallet");

const walletController = {
   wallet :async (req,res)=>{
    try {
        const userId = req.session.userID
        const wallet = await Wallet.findOne({userId:userId}).populate('userId')
        console.log(wallet);
        res.status(200).render('wallet',{title: "Wallet",wallet,user: req.session.user})
    } catch (error) {
        console.error(error);
        res.json({error:'Internal server error'})
    }
  },
  
   addAmount :async (req,res)=>{
    try {
        const userId = req.session.userID
        const amount = req.body.amount
        const userWallet =  await Wallet.findOne({userId:userId}) 
        userWallet.balance +=parseInt(amount)
        await userWallet.save()
        res.json({success:true})
    } catch (error) {
        console.error(error);
    }
  },
  checkWalletBalance  :async (req, res, next) => {
    try {
        const userId = req.session.userID; 

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Wallet not found for the user' });
        }

        res.json({ success: true, balance: wallet.balance });
    } catch (error) {
        next(error);
    }
}
}


module.exports = walletController;