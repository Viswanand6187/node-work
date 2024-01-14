// const MongoClient = require('mongodb').MongoClient
// const state = {
//     db:null
// };
 
// module.exports.connect = function(done){

//     const url ='mongodb://127.0.0.1:27017';
//     const dbname='shopping'

//     MongoClient.connect(url,(err,data)=>{
//         if(err) return done(err)
//         state.db=data.db(dbname)
//         done();
//     })
     
// }

// module.exports.get= function(){
//     return state.db
// }


const MongoClient = require('mongodb').MongoClient;

let state = {
  db: null,
};

module.exports.connect = async function () {
  const url = 'mongodb://127.0.0.1:27017';
  const dbname = 'shopping';

  try {
    const data = await MongoClient.connect(url);
    state.db = data.db(dbname);
    console.log('Connected to database successfully');
  } catch (err) {
    console.error('Error connecting to database:', err);
    throw err; // Propagate the error upwards for handling
  }
};

module.exports.get = function () {
  return state.db;
};

