var express = require('express');
var router = express.Router();
var db = require('../config/connection');
var collection=require('../config/collections');
var productHelper= require('../helpers/product-helpers');
var userHelper= require('../helpers/user-helpers');
const verifyLogin=(req,res,next)=>{
  if(req.session.loggedIn){
    next();
  }else
  res.redirect('/login');
}
// const { response } = require('../app');
// const { response } = require('../app');
/* GET home page. */


router.get('/', async function(req, res, next) {
  try {
    let user = req.session.user;
    console.log(user);

    let cartCount = null;
    if (user) {
      cartCount = await userHelper.getCartCount(user._id); // Await the cart count
    }

    let products = await productHelper.getAllProducts(); // Await fetching all products
    res.render('user/view-products', { products, user, cartCount });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error rendering products');
  }
});


router.get('/login', (req, res) => {
  if(req.session.loggedIn){
    res.redirect('/')
  }else
  res.render('user/login',{"loginerr":req.session.loginerr});
  req.session.loginerr=false;
});


router.get('/signup',(req,res)=>{
  res.render('user/signup');
})

router.post('/signup',(req,res)=>{
 userHelper.dosignup(req.body).then((response)=>{
  console.log(response);
  req.session.loggedIn=true;
  req.session.user=response;
  res.redirect('/');
 })
})

router.post('/login',(req,res)=>{
  userHelper.dologin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedIn=true;
      req.session.user=response.user;
    res.redirect('/')
    }else{
      req.session.loginerr="Invalid username or password"
      res.redirect('/login')
    }
  })
})

router.get('/logout',(req,res)=>{
  req.session.destroy();
  res.redirect('/');
})

router.get('/cart', verifyLogin, async (req, res) => {
  try {
    // Fetch cart products and cart ID
    let { cartId, products } = await userHelper.getCartProducts(req.session.user._id);
    let totalValue = await userHelper.getTotalAmount(req.session.user._id)
    console.log("Cart ID:",cartId)
    console.log("Total Value",totalValue)
    // Render 'user/cart' view with products and cartId
    res.render('user/cart', { products, user: req.session.user, cartId,totalAmount: totalValue.totalAmount});
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching cart products');
  }
});

router.get('/add-to-cart/:id', (req, res) => {
  console.log("api call")
  const productId = req.params.id; // Assuming the parameter in the URL is 'id'
  const userId = req.session.user._id; // Assuming you're retrieving user ID from the session

  userHelper.addToCart(productId, userId)
    .then(() => {
      // res.redirect('/');
      res.json({status:true})
    })
    .catch((err) => {
      // Handle error here, e.g., res.send('Error adding to cart');
      console.error(err);
    });
});

router.post('/change-product-quantity', (req, res, next) => {
  userHelper.changeProductQuantity(req.body)
      .then(async(response) => {
        response.total = await userHelper.getTotalAmount(req.body.user)
          res.json(response) 
      })
      
});

router.post('/remove-product',(req,res,next)=>{
  console.log(req.body)
  userHelper.removeProductFromCart(req.body).then((response)=>{
    
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,async(req,res,next)=>{
  let total = await userHelper.getTotalAmount(req.session.user._id)
 // console.log(req.session.user._id)
// res.render('user/place-order',{ total: total.totalAmount})
res.render('user/place-order', { total: { userId: req.session.user._id, totalAmount: total.totalAmount } })

})

router.post('/place-order',async(req,res)=>{
  let products= await userHelper.getCartProductList(req.body.userId)
  let totalprice = await userHelper.getTotalAmount(req.body.userId)
  userHelper.placeOrder(req.body,products,totalprice,req.body.userId).then((response)=>{
  res.json({status:true})
  })
  //console.log(req.body)
})
router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})
// router.get('/orders',async(req,res)=>{
//   let orders= await userHelper.getUserOrders(req.session.user._id)
//   console.log("User ID:",req.session.user._id)
//   res.render('user/orders',{user:req.session.user,orders})
// })

router.get('/orders', async (req, res) => {
  try {
    let orders = await userHelper.getUserOrders(req.session.user._id);
    console.log("User ID:", req.session.user._id);
    res.render('user/orders', { user: req.session.user, orders });
  } catch (error) {
    console.error("Error in route handler:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/view-order-products/:id',async(req,res)=>{
  let products = await userHelper.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,products})
})
module.exports = router;   
