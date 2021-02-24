var jwt = require('jsonwebtoken');
const { merge } = require('../app');

//these routes require a new token being generated and sent back
const newSessionRoutes = [
    { path: '/users/login/', method: 'POST' },
];
//these routes require an Authorization header in the request
const authRoutes = [
    { path: '/users/password/change/', method: 'PUT' },
    { path: '/users/email/change/', method: 'PUT' },
    { path: '/users/info/change/', method: 'PUT' },
];

//the secret key to be used in generating and verifying the tokens (for better security, generate a random byte string and store it in a .env file).
const SECRET_KEY = "CLIENT-SERVER_PROJECT_JWT_SECRET_KEY"; //this


//determine whether or not a new session token is required based on the method and the URL
const isNewSessionRequired = (httpMethod, url) => {
  for (let routeObj of newSessionRoutes) {
    if (routeObj.method === httpMethod && routeObj.path === url) {
      return true;
    }
  }
  return false;
}

//determine whether or not authentication, i.e. verifying the token, is required
const isAuthRequired = (httpMethod, url) => {
  for (let routeObj of authRoutes) {
    if (routeObj.method === httpMethod && routeObj.path === url) {
      return true;
    }
  }
  return false;
}



//generates a new JWT based on the user data received
const generateJWTToken = (userData) =>{
    return jwt.sign(userData, SECRET_KEY);
}


//verifies the given token.
const verifyToken = (jwtToken) =>{
    try{
       return jwt.verify(jwtToken, SECRET_KEY);
    }catch(e){
       console.log('e:',e);
       return null;
    }
 }



module.exports = {
 isNewSessionRequired: isNewSessionRequired,
 isAuthRequired: isAuthRequired,
 generateJWTToken: generateJWTToken,
 verifyToken: verifyToken
}
