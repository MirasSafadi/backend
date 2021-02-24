var express = require('express');
var generateJWTToken = require('../utils/authUtils').generateJWTToken;
var urlCrypt = require('url-crypt')('~{ry*I)44==yU/]9<7DPk!Hj"R#:-/Z7(hTBnlRS=4CXF');
var router = express.Router();

var crypto = require('crypto');
const nodemailer = require("nodemailer");
var validators = require('../utils/inputValidators');


const MongoClient = require('mongodb').MongoClient;
//this
const url = "mongodb+srv://TechShop-Website:130795mrS@techshop-cluster.adibf.mongodb.net/TechShop?retryWrites=true&w=majority";



router.post('/login/', (req, res, next) => {

  var email = req.body.email;
  var password = req.body.password;
  var hashed_password = crypto.createHash('sha256').update(password).digest('hex');
  console.log('here',req.body)
  MongoClient.connect(url,{ useUnifiedTopology: true }, function(err, db) {
    if (err) return res.status(406).json({error: 'Cannot login with provided credentials'});
    var dbo = db.db("TechShop");

    dbo.collection("TechShop_Collection").findOne({ email: email },{ projection: { _id: 0, promo_codes: 0 } }, function(e, result) {
      if (e) return res.status(406).json({error: 'Cannot login with provided credentials'});
      if(result.password === hashed_password){
        var user_info = {
          email: email,
          password: hashed_password,
        };
        delete result.password;
        res.status(200).json({token: generateJWTToken(user_info), user: result });
      } else{
        res.status(406).json({error: 'Cannot login with provided credentials'})
      }
      db.close();
    });
  });
});


//save the url-crypt in the database and only after verification insert the user to the DB
router.post('/register/', async (req, res, next) => {
  
  var email = req.body.email;
  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var password1 = req.body.password1;
  var password2 = req.body.password2;


  //check if user exists...
  let userExists = await exists({email: email});
  if(userExists){
    return res.status(403).json({error: 'User Exists!'});
  }

  
  //input validation...
  if(!validators.validate(validators.validation_types.NAME,first_name) || first_name === ''){
    return res.status(403).json({error: 'First name must contain only English letters.'});
  }
  if(!validators.validate(validators.validation_types.NAME,last_name) || last_name === ''){
    return res.status(403).json({error: 'Last name must contain only English letters.'});
  }
  if(!validators.validate(validators.validation_types.EMAIL,email) || email === ''){
    return res.status(403).json({error: 'Invalid email'});
  }
  if(password1 === '' || password2 === ''){
    return res.status(403).json({error: 'Invalid Password'});
  }
  if(password1 !== password2){
    return res.status(403).json({error: 'Passwords do not match!'});
  }
  if(!validators.validate(validators.validation_types.PASSWORD,password1)){
    return res.status(403).json({error: 'Invalid Password'});
  }


  var hashed_password = crypto.createHash('sha256').update(password1).digest('hex');

  var payload = {
    user: {
      email: email,
      first_name: first_name,
      last_name: last_name,
      password: hashed_password
    },
    date: new Date(),
    ip: req.ip
  }
  var base64 = urlCrypt.cryptObj(payload);
  var registrationUrl = req.headers.origin + '/register/checkLink/' + base64;

  var data = { base64: base64}
  //add the base64 to mongo
  let insertRes = await insertData(data);
  if(!insertRes){
    return res.status(500).json({error: 'Could not register!'});
  }

  var message = {
    to: email,
    registrationUrl: registrationUrl
  };

  if(await sendMail('registration',message)){
    return res.status(200).send('Email sent!')
  }
  return res.status(500).json({ error: 'mail error' })
  // return res.status(200).send('Email sent!')
});


router.post('/register/verify/', async (req, res, next) => {
  const base64 = req.body.base64;
  let linkExists = await exists({ base64: base64 })
  if(!linkExists){
    return res.status(400).json({error: 'Corrupted Link!'});
  }  
  //extract user info from base64..
  var payload;
  var user;

  try {
    var OneDay = new Date().getTime() + (1 * 24 * 60 * 60 * 1000);
    payload =  urlCrypt.decryptObj(base64);
    user = payload.user;
    var ip = payload.ip;
    var date = payload.date;
    if(ip !== req.ip){
      throw new Error();
    }
    if(OneDay < date ){ //date is more than 24 hours
      throw new Error();
    }
  } catch(e) {
    // The link was mangled or tampered with.
    return res.status(400).json({error: 'Corrupted Link!'});
  }

  MongoClient.connect(url,{ useUnifiedTopology: true }, function(err, db) {
    if (err) console.log(err);
    var dbo = db.db("TechShop");
    var newValues = {
      $set: {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        password: user.password,
        promo_codes: [
          {
            code: "NEWUS3R", 
            description: "%5 discount"
          }
        ]
      },
      $unset: {base64: 1}
    }
    var query = { base64: base64 };

    dbo.collection("TechShop_Collection").updateOne(query,newValues, function(e, result) {
      if (e) console.log(e);
      if(result.result.ok === 1){
        res.status(200).send('Succesfully registered');
      }else{
        res.status(500).json({error: 'internal server error'});
      }
      db.close();
    });
  });

});

router.post('/password/reset/', async (req,res,next) => {
  let email = req.body.email;

  if(!validators.validate(validators.validation_types.EMAIL,email) || email === ''){
    return res.status(403).json({error: 'Invalid email'});
  }

  //check if user exists...
  let userExists = await exists({email: email});
  if(!userExists){
    return res.status(404).json({error: 'User Does not Exists!'});
  }

  let userInfo = await findRecord({email: email});
  let payload = {
    user: {
      email: userInfo.email,
      password: userInfo.password
    },
    ip: req.ip,
    date: new Date()
  }

  var base64 = urlCrypt.cryptObj(payload);
  var resetPasswordUrl = req.headers.origin + '/password/reset/verify/' + base64;


  var message = {
    to: email,
    resetPasswordUrl: resetPasswordUrl
  }
  

  if(await sendMail('reset-password',message)){
    return res.status(200).send('Email sent!')
  }
  return res.status(500).json({ error: 'mail error' })

});

router.post('/password/reset/verify/', async (req,res,next) => {
  var base64 = req.body.base64;
  var password1 = req.body.password1;
  var password2 = req.body.password2;

  if(password1 === '' || password2 === ''){
    return res.status(403).json({error: 'Invalid Password'});
  }
  if(password1 !== password2){
    return res.status(403).json({error: 'Passwords do not match!'});
  }
  if(!validators.validate(validators.validation_types.PASSWORD,password1)){
    return res.status(403).json({error: 'Invalid Password'});
  }
  var hashed_password = crypto.createHash('sha256').update(password1).digest('hex');
  var payload;
  var user;

  try {
    var OneDay = new Date().getTime() + (1 * 24 * 60 * 60 * 1000);
    payload =  urlCrypt.decryptObj(base64);
    var ip = payload.ip;
    var date = payload.date;
    if(ip !== req.ip){
      console.log('1')
      throw new Error();
    }
    if(OneDay < date ){ //date is more than 24 hours
      console.log('2')
      throw new Error();
    }
    //check if user does not exists...
    var userExists = await exists({email: payload.user.email});
    if(!userExists){
      console.log('3')
      throw new Error();
    }
    user = await findRecord({email: payload.user.email});
    if(user.password !== payload.user.password){
      console.log(user,payload.user)
      console.log('4')
      throw new Error();
    }
    if(hashed_password ===  payload.user.password){
      return res.status(403).json({error: 'New password cannot be identical to old password'});
    }
  } catch(e) {
    // The link was mangled or tampered with.
    return res.status(400).json({error: 'Corrupted Link!'});
  }
  
  
  var newValues = {
    $set: {
      password: hashed_password,
    }
  }
  var query = { email: user.email };
  let updateResult = await updateRecord(query,newValues)
  if(updateResult){
    if(await sendMail('password-change',{ to: user.email})){
      return res.status(200).send('success');
    }
    return res.status(500).json({error: 'Internal server error!'});
  }
  return res.status(500).json({error: 'Internal server error!'});

});

router.put('/password/change/', async (req,res,next) => {
  var old_password = req.body.old_password;
  var new_password1 = req.body.new_password1;
  var new_password2 = req.body.new_password2;
  var userData = req.session.userData;

  var hashed_old_password = crypto.createHash('sha256').update(old_password).digest('hex');
  if(userData.password !== hashed_old_password){
    return res.status(406).json({error: 'old password is incorrect'});
  }
  if(new_password1 === '' || new_password2 === ''){
    return res.status(403).json({error: 'Invalid Password'});
  }
  if(new_password1 !== new_password2){
    return res.status(403).json({error: 'Passwords do not match!'});
  }
  if(!validators.validate(validators.validation_types.PASSWORD,new_password1)){
    return res.status(403).json({error: 'Invalid Password'});
  }
  var hashed_new_password = crypto.createHash('sha256').update(new_password1).digest('hex');
  var newValues = {
    $set: {
      password: hashed_new_password,
    }
  }
  var query = { email: userData.email };
  let updateResult = await updateRecord(query,newValues)
  if(updateResult){
    if(await sendMail('password-change',{ to: userData.email })){
      return res.status(200).send('success');
    }
    return res.status(500).json({error: 'Internal server error!'});
  }
  return res.status(500).json({error: 'Internal server error!'});
});


router.put('/email/change/', async (req,res,next) =>{
  var email = req.body.email;
  var old_email = req.session.userData.email;
  var ip = req.ip;

  var payload = {
    
    user: {//add old email  //********************* */
      old_email: old_email,
      email: email,
    },
    date: new Date(),
    ip: ip
  }
  //validate new email with regex
  if(!validators.validate(validators.validation_types.EMAIL,email)){
    return res.status(403).json({error: 'Invalid E-Mail'});
  }

  var base64 = urlCrypt.cryptObj(payload);
  var emailVerification = req.headers.origin + '/email/change/checkLink/' + base64;

  var message = {
    to: email,
    emailVerification: emailVerification
  };

  if(await sendMail('email-change',message)){
    return res.status(200).send('Email sent successfully!')
  }
  return res.status(500).json({ error: 'Error in sending e-mail' })

});

router.put('/email/change/verify/', async (req,res,next) =>{
  /** TODO:  */
  //decrypt object
  //get payload, from payload get new email (payload.new_email)
  //payload will also include old email to check in the database

  var base64 = req.body.base64;
  var payload;

  try {
    var OneDay = new Date().getTime() + (1 * 24 * 60 * 60 * 1000);
    payload =  urlCrypt.decryptObj(base64);
    var ip = payload.ip;
    var date = payload.date;
    var new_email = payload.user.email;
    var old_email = payload.user.old_email;
    if(ip !== req.ip){
      console.log('1')
      throw new Error();
    }
    if(OneDay < date ){ //date is more than 24 hours
      console.log('2')
      throw new Error();
    }
    //check if user does not exists...
    var userExists = await exists({email: old_email});
    if(!userExists){
      console.log('3')
      throw new Error();
    }
    var newValues = {
      $set: {
        email: new_email,
      }
    }
    var query = {email: old_email};
    let updateResult = await updateRecord(query,newValues)
    if(updateResult){
      return res.status(200).send('success');
    }
  } catch(e) {
    // The link was mangled or tampered with.
    return res.status(400).json({error: 'Corrupted Link!'});
  }
});

router.put('/info/change/', async (req,res,next) =>{
  //req.body will include first_name, last_name, country, city, street, zipCode, phone_number
  //just update in DB
  //get email from userData => query = {email: userData.email}
  var userData = req.session.userData;
  var email = userData.email;

  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var country = req.body.country;
  var city = req.body.city;
  var street = req.body.street;
  var zipCode = req.body.zipCode;
  var phone_number = req.body.phone_number;
  

  //validate input
  if(!validators.validate(validators.validation_types.NAME,first_name)){
    return res.status(403).json({error: 'Invalid First Name'});
  }
  if(!validators.validate(validators.validation_types.NAME,last_name)){
    return res.status(403).json({error: 'Invalid Last Name'});
  } 
  if(!validators.validate(validators.validation_types.NAME,country)){
    return res.status(403).json({error: 'Invalid Country'});
  }
  if(!validators.validate(validators.validation_types.NAME,city)){
    return res.status(403).json({error: 'Invalid City'});
  }
  if(!validators.validate(validators.validation_types.DIGITS,zipCode)){
    return res.status(403).json({error: 'Invalid ZIP Code'});
  }
  if(!validators.validate(validators.validation_types.DIGITS,phone_number)){
    return res.status(403).json({error: 'Invalid Phone Number'});
  }

  var newValues = {
    $set: {
      first_name: first_name,
      last_name: last_name,
      country: country,
      city: city,
      street: street,
      zipCode: zipCode,
      phone_number: phone_number,
    }
  }
  var query = { email: email };

  let updateResult = await updateRecord(query,newValues)
  if(updateResult){
    if(await sendMail('info-change',{to: email})){
      return res.status(200).send('success');
    }
    return res.status(500).json({error: 'Internal server error!'});
  }
  return res.status(500).json({error: 'Internal server error!'});
});


async function sendMail(type,message){
  const to = message.to;

  let sender = {
    email: 'csp.techshop3@gmail.com', 
    password: '159753tS' //this
  }
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: sender.email, // generated ethereal user
      pass: sender.password, // generated ethereal password
    },
  });


  if(type === 'registration'){
    // send mail with defined transport object
    await transporter.sendMail({
      from: 'TechShop <csp.techshop3@gmail.com>', // sender address
      to: to, // list of receivers
      subject: "Verify Your Account", // Subject line
      html: `<center><h1>Welcome to TechShop!</h1><br/><h3><a href="${message.registrationUrl}">Click here</a> to verify your email.</h3></center>`,// html body
    },(err,info) =>{
      console.log(info);
      if(err){
        console.log(err);
        return false;
      }
    });
    return true
  } else if(type === 'reset-password'){
    // send mail with defined transport object
    transporter.sendMail({
      from: 'TechShop <csp.techshop3@gmail.com>',
      to: to,
      subject: "Reset Your Password",

      //change that to an html page..
      text: "Reset your password",
      html: `<center><h1>We heard you forgot your password!</h1><br/><h3>No worries, just <a href="${message.resetPasswordUrl}">Click here</a> to reset it.</h3></center>`,
    }, (err, info) => {
      console.log(info);
      if(err){
        console.log(err);
        return false;
      }
      
    });
    return true;
  } else if(type === 'password-change'){
    // send mail with defined transport object
    transporter.sendMail({
      from: 'TechShop <csp.techshop3@gmail.com>',
      to: to,
      subject: "Your password was changed",

      //change that to an html page..
      text: "Your password was changed",
      html: `<center><h1>You changed your password!</h1><br/><h3>Just letting you know...</h3><p>If you do not remember changing your password go and reset it.</p></center>`,
    }, (err, info) => {
      console.log(info);
      if(err){
        console.log(err);
        return false;
      }
      
    });
    return true;
  } else if(type === 'email-change'){
    // send mail with defined transport object
    transporter.sendMail({
      from: 'TechShop <csp.techshop3@gmail.com>',
      to: to,
      subject: "Your email was changed",

      //change that to an html page..
      text: "Your email was changed",
      html:  `<center><h1>You changed your email!</h1><br/><h3>You need to <a href="${message.emailVerification}">verify it</a> before you login</h3></center>`,
    }, (err, info) => {
      console.log(info);
      if(err){
        console.log(err);
        return false;
      }
      
    });
    return true;
  } else if(type === 'info-change'){
    // send mail with defined transport object
    transporter.sendMail({
      from: 'TechShop <csp.techshop3@gmail.com>',
      to: to,
      subject: "Your info was changed",

      //change that to an html page..
      text: "Your info was changed",
      html:  `<center><h1>You changed your info!</h1><br/><h3>Just letting you know...</h3><p>If you do not remember changing your info go and reset your password.</p></center>`,
    }, (err, info) => {
      console.log(info);
      if(err){
        console.log(err);
        return false;
      }
      
    });
    return true;
  }
  return false;
}


async function exists(query){
  const client = await MongoClient.connect(url, { useUnifiedTopology: true })
    .catch(err => { console.log(err); });
  if (!client) {
    throw new Error('Mongo Error');
  }
  try {
      const db = client.db("TechShop");
      let collection = db.collection("TechShop_Collection")

      let res = await collection.findOne(query);
      if(res){
        client.close();
        return true;
      }

  } catch (err) {
      console.log(err);
  } finally {
      client.close();
  }
  return false;
}
async function insertData(data){
  const client = await MongoClient.connect(url, { useUnifiedTopology: true })
    .catch(err => { console.log(err); });
  if (!client) {
    throw new Error('Mongo Error');
  }
  try {
      const db = client.db("TechShop");
      let collection = db.collection("TechShop_Collection")

      let res = await collection.insertOne(data);
      if(res.result.ok === 1){
        client.close();
        return true;
      }
  } catch (err) {
      console.log(err);
  } finally {
      client.close();
  }
  return false;
}

async function findRecord(query){
  const client = await MongoClient.connect(url, { useUnifiedTopology: true })
    .catch(err => { console.log(err); });
  if (!client) {
    throw new Error('Mongo Error');
  }
  try {
      const db = client.db("TechShop");
      let collection = db.collection("TechShop_Collection")

      let res = await collection.findOne(query);
      if(res){
        return res;
      }

  } catch (err) {
      console.log(err);
  } finally {
      client.close();
  }
  return null;
}

async function updateRecord(query,newValues){
  const client = await MongoClient.connect(url, { useUnifiedTopology: true })
    .catch(err => { console.log(err); });
  if (!client) {
    throw new Error('Mongo Error');
  }
  try {
      const db = client.db("TechShop");
      let collection = db.collection("TechShop_Collection")

      let res = await collection.updateOne(query,newValues);
      return res.result.ok === 1;

  } catch (err) {
      console.log(err);
  } finally {
      client.close();
  }
}

module.exports = router;