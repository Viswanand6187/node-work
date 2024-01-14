var express = require('express');
var router = express.Router();
var productHelper= require('../helpers/product-helpers');
const fs = require('fs');

/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelper.getAllProducts().then((products)=>{
    console.log(products);
    res.render('admin/view-products',{admin:true,products});
  })
  
  // res.render('admin/view-products',{admin:true,products});
});

router.get('/add-product',function (req,res){
  res.render('admin/add-product');
})


router.post('/add-product', (req, res) => {
  let product = {
      name: req.body.Name,
      category: req.body.Category,
      price: req.body.Price,
      description: req.body.Description,
  };

  let image = req.files.Image;

  productHelper.addproduct(product, image, (result) => {
      res.render('admin/add-product');
  });
});

router.get('/delete-product/:id',(req,res)=>{
  let proId = req.params.id;
  console.log(proId);
  // console.log(req.query.name);
  productHelper.deleteproducts(proId).then((response)=>{
  res.redirect('/admin/')
  })

})

router.get('/edit-product/:id',async (req,res)=>{
  let product = await productHelper.getproductdetails(req.params.id);
  console.log(product);
  res.render('admin/edit-product',{product})
})

router.post('/edit-product/:id', (req, res) => {
  let proId = req.params.id;
  let proDetails = req.body;

  productHelper.updateproduct(proId, proDetails).then(() => {
      if (req.files && req.files.Image) {
          let image = req.files.Image;
          const imagePath = './public/product-images/' + proId + '.jpg';

          fs.writeFile(imagePath, image.data, (err) => {
              if (err) {
                  console.log(err);
              }
              res.redirect('/admin');
          });
      } else {
          res.redirect('/admin');
      }
  });
});

module.exports = router;
