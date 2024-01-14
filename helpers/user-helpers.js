var db = require('../config/connection');
var collection=require('../config/collections');
const CART_PRODUCT_COLLECTION = 'cart_products';
const bycrpt=require('bcrypt');
const { ObjectId } = require('mongodb');
const {  response } = require('express');
module.exports = {
    dosignup: async (userData) => {
        try {
            userData.Password = await bycrpt.hash(userData.Password, 10);
            const dbResponse = await db.get().collection(collection.USER_COLLECTION).insertOne(userData);
            if (dbResponse.insertedId) {
                console.log("Inserted User Data:", userData);
                return dbResponse.insertedId; // Return the inserted ID
            } else {
                throw new Error('Insertion failed'); // Handle insertion failure
            }
        } catch (error) {
            throw new Error(error.message);
        }
    },
    dologin: (userData) =>{
        let loginstatus=false
        let response ={}
        return new Promise(async(resolve,reject)=>{
        let user= await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
        if(user){
            bycrpt.compare(userData.Password,user.Password).then((status)=>{
             if(status){
                console.log('Login success');
                response.user=user;
                response.status=true;
                resolve(response)
             }else {
                console.log('Login Failed');
                resolve({status:false})
             }
            })
        }else{
            console.log('login failed');
            resolve({status:false})
        }
        })
    },
    addToCart: async (proId, userId) => {
        try {
          let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
          
      
          if (userCart) {
            // Check if the product already exists in the cart
            let productExistIndex = userCart.products.findIndex(product => product.item.toString() === proId);
            if (productExistIndex !== -1) {
              // If the product exists, increment its quantity
              userCart.products[productExistIndex].quantity += 1;
            } else {
              // If the product is not in the cart, add it with quantity 1
              userCart.products.push({
                item: new ObjectId(proId),
                quantity: 1
              });
            }
      
            // Update the existing cart with the modified 'products' array
            await db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) }, { $set: { products: userCart.products } });
          
            return Promise.resolve(userCart._id);
          } else {
            // If the user's cart doesn't exist, create a new cart and add the product
            let cartObj = {
              user: new ObjectId(userId),
              products: [{
                item: new ObjectId(proId),
                quantity: 1
              }]
            };
            await db.get().collection(collection.CART_COLLECTION).insertOne(cartObj);
            return Promise.resolve(cartObj._id);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      },

      getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
          try {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
              {
                $match: { user: new ObjectId(userId) }
              },
              {
                $unwind: '$products' // Deconstructs the 'products' array
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: 'products.item',
                  foreignField: '_id',
                  as: 'cartProduct' // Renamed from 'cartProducts' to represent a single product
                }
              },
              {
                $unwind: '$cartProduct' // Deconstructs the 'cartProduct' array
              },
              {
                $group: {
                  _id: '$_id',
                  cartId: { $first: '$_id' }, // Include cartId in the result
                  products: { $push: { $mergeObjects: ['$products', '$cartProduct'] } }
                }
              }
            ]).toArray();
      
            if (cartItems.length > 0) {
              // Resolve with both cartId and products
              resolve({ cartId: cartItems[0].cartId, products: cartItems[0].products });
            } else {
              resolve({ cartId: null, products: [] }); // Resolve with null cartId and empty products array
            }
          } catch (error) {
            reject(error);
          }
        });
      },
      


      getCartCount: async (userId) => {
        try {
          let count = 0;
          let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
      
          if (cart && cart.products) {
            count = cart.products.reduce((total, product) => total + product.quantity, 0);
            // If each product in the cart has a 'quantity' property, sum up the quantities
          }
      
          return count; // Resolve the promise with the count value
        } catch (error) {
          throw error; // Reject the promise if there's an error
        }
      },

      changeProductQuantity:(details)=>{
      details.count=parseInt(details.count)
      details.quantity=parseInt(details.quantity)
      return new Promise((resolve,reject)=>{
        if(details.count === -1 && details.quantity === 1){
          db.get().collection(collection.CART_COLLECTION)
          .updateOne({_id: new ObjectId(details.cart)},
          {
            $pull:{products:{item: new ObjectId(details.product)}}
          }
          ).then((response)=>{
            resolve({removeProduct:true})
          })
        }
        else{
      db.get().collection(collection.CART_COLLECTION)
      .updateOne({_id:new ObjectId(details.cart),'products.item':new ObjectId(details.product)},
          {
             $inc:{'products.$.quantity':details.count}
          }
          ).then((response)=>{
            resolve({status:true})
          })
        }
        })
      },
      removeProductFromCart:(data)=>{
        return new Promise(async(resolve,reject)=>{
          db.get().collection(collection.CART_COLLECTION)
          .updateOne({_id: new ObjectId(data.cart)},
          {
            $pull:{products:{item: new ObjectId(data.product)}}
          }
          ).then((response)=>{
            resolve({removeProduct:true})
          })
        })
      },
      getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
          try {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
              {
                $match: { user: new ObjectId(userId) }
              },
              {
                $unwind: '$products' // Deconstructs the 'products' array
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: 'products.item',
                  foreignField: '_id',
                  as: 'cartProduct' // Renamed from 'cartProducts' to represent a single product
                }
              },
              {
                $unwind: '$cartProduct' // Deconstructs the 'cartProduct' array
              },
              {
                $addFields: {
                  totalAmount: {
                    $multiply: [
                      { $convert: { input: '$products.quantity', to: 'double', onError: 0 } }, // Convert quantity to double
                      { $convert: { input: '$cartProduct.price', to: 'double', onError: 0 } } // Convert price to double
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$_id',
                  cartId: { $first: '$_id' }, // Include cartId in the result
                  products: {
                    $push: {
                      $mergeObjects: [
                        '$products',
                        '$cartProduct',
                        { totalAmount: '$totalAmount' } // Include the totalAmount in the merged object
                      ]
                    }
                  },
                  totalAmount: { $sum: '$totalAmount' } // Calculate the total amount for the cart
                }
              }
            ]).toArray();
      
            if (total.length > 0) {
              // Resolve with both cartId, products, and totalAmount
              const result = {
                cartId: total[0].cartId,
                products: total[0].products,
                totalAmount: total[0].totalAmount
              };
              console.log(result); // Console log the result
              resolve(result);
            } else {
            //  resolve({ cartId: null, products: [], totalAmount: 0 }); // Resolve with null cartId, empty products array, and totalAmount as 0
                  resolve({totalAmount:0})
          }
          } catch (error) {
            reject(error);
          }
        });
      },
     placeOrder:(order,products,total,userId)=>{
     return new Promise((resolve,reject)=>{
      //console.log(order,products,total)
      let status = order['payment-method']=== 'COD'?'Placed':'pending'
      let orderObj = {
        deliveryDetails: {
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode
        },
        userId: new ObjectId(userId),
        paymentmethod: order['payment-method'],
        products: products,
        totalAmount: total,
        status:status,
        date: new Date()
      }
      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
        db.get().collection(collection.CART_COLLECTION).deleteOne({user: new ObjectId(order.userId)})
        resolve()
      })
     })
     },
     getCartProductList:(userId)=>{
      return new Promise(async(resolve,reject)=>{
        let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user: new ObjectId(userId)})
        console.log(cart)
        resolve(cart.products)
      })
     },
    //  getUserOrders:(userId)=>{
    //  return new Promise(async(resolve,reject)=>{
    //   console.log(userId)
    //   let orders = await db.get().collection(collection.ORDER_COLLECTION).
    //   find({user: new ObjectId(userId)}).toArray()
    //   console.log("Orders:",orders)
    //   resolve(orders)
    //  })
    //  },
    getUserOrders: async (userId) => {
      try {
        const orders = await db.get().collection(collection.ORDER_COLLECTION)
          .find({ userId: new ObjectId(userId) })
          .toArray();
    
        console.log("Orders:", orders); // Log the retrieved orders
    
        return orders; // Return the orders
      } catch (error) {
        console.error("Error fetching orders:", error);
        throw error; // Throw the error to handle it in the calling function
      }
    },
    
    //  getOrderProducts:(orderId)=>{
    //   return new Promise(async(resolve,reject)=>{
    //     let orderItems = await db.get().collection(collection.ORDER_COLLECTION).
    //     aggregate([
    //       {
    //         $match:{_id: new ObjectId(orderId)}
    //       },
    //       {
    //         $unwind:'$products'
    //       },
    //       {
    //         $project:{
    //         item:'$products.item',
    //         quantity:'$products.quantity'
    //         }
    //       },
    //       {
    //         $lookup:{
    //           from:collection.PRODUCT_COLLECTION,
    //           localField:'item',
    //           foreignField:'_id',
    //           as:'product'
    //         }
    //       },
    //       {
    //         $project:{
    //           item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    //         }
    //       }
    //     ]).toArray()
    //     console.log(orderItems)
    //     resolve(orderItems)
    //   })
    //  }
      
    getOrderProducts: async (orderId) => {
      return new Promise(async (resolve, reject) => {
        try {
          orderId = new ObjectId(orderId); // Convert to ObjectId if needed
    
          let orderItems = await db.get().collection(collection.ORDER_COLLECTION)
            .aggregate([
              {
                $match: { _id: orderId }
              },
              {
                $unwind: '$products'
              },
              {
                $project: {
                  item: '$products.item',
                  quantity: '$products.quantity'
                }
              },
              {
                $lookup: {
                  from: collection.PRODUCT_COLLECTION,
                  localField: 'item',
                  foreignField: '_id',
                  as: 'product'
                }
              },
              {
                $project: {
                  item: 1,
                  quantity: 1,
                  product: { $arrayElemAt: ['$product', 0] }
                }
              }
            ]).toArray();
    
          console.log("orderItems:", orderItems);
    
          if (orderItems.length === 0) {
            console.log("No products found for the order");
          }
    
          resolve(orderItems);
        } catch (error) {
          console.error("Error in getOrderProducts:", error);
          reject(error);
        }
      });
    }
    
}  