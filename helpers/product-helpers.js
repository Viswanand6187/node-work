var db = require('../config/connection');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const { resolve } = require('dns');
var collection=require('../config/collections');
const { response } = require('express');

module.exports = {
    addproduct: (product, image, callback) => {
        db.get().collection('product').insertOne(product).then((data) => {
            const insertedId = data.insertedId;
            const imagePath = './public/product-images/' + insertedId + '.jpg';

            fs.writeFile(imagePath, image.data, (err) => {
                if (err) {
                    console.log(err);
                    return callback(false);
                }
                callback(true);
            });
        });
    },

    getAllProducts:(callback)=>{
        return new Promise(async (resolve,reject)=>{
            let products =await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteproducts: (proId) => {
        return new Promise((resolve, reject) => {
          console.log(proId);
          console.log(new ObjectId(proId)); // Use new ObjectId to convert proId
          db.get().collection(collection.PRODUCT_COLLECTION)
            .deleteOne({ _id: new ObjectId(proId) }) // Use new ObjectId to convert proId
            .then((response) => {
              console.log(response);
              resolve(response);
            })
            .catch((error) => {
              console.error(error);
              reject(error);
            });
        });
      },
      getproductdetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id: new ObjectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
      },
      updateproduct:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:new ObjectId(proId)},{
                $set: {
                    name: proDetails.Name,
                    category :proDetails.Category,
                    price: proDetails.Price,
                    description: proDetails.Description
                }
            }).then((response)=>{
                resolve()
            })
                
            
        })
      }

};
