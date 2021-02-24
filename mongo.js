const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://TechShop-Website:130795mrS@techshop-cluster.adibf.mongodb.net/TechShop?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true });

module.exports = client