var express = require('express');
// var client = require('../mongo');
var router = express.Router();

router.get('/', function(req, res, next) {
    // res.send({text: 'testing...'})
    // perform actions on the collection object
    var MongoClient = require('mongodb').MongoClient;
    var url = "mongodb+srv://TechShop-Website:130795mrS@techshop-cluster.adibf.mongodb.net/TechShop?retryWrites=true&w=majority";

    MongoClient.connect(url,{ useUnifiedTopology: true }, function(err, db) {
      if (err) console.log(err);
      var dbo = db.db("TechShop");
  
      dbo.collection("TechShop_Collection").findOne({ email: 'safadimiras@gmail.com' },{ projection: { _id: 0, password: 0, promo_codes: 0 } }, function(e, result) {
        if (e) console.log(e);
        res.status(200).json({user: result});
        db.close();
      });
    });
});



module.exports = router;