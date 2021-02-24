var express = require('express');
var router = express.Router();

const MongoClient = require('mongodb').MongoClient;
const url = "mongodb+srv://TechShop-Website:130795mrS@techshop-cluster.adibf.mongodb.net/TechShop?retryWrites=true&w=majority";

router.get('/computers/', async (req,res,next) =>{

});


router.get('/phones/', async (req,res,next) =>{

});

module.exports = router;