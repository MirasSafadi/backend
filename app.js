var createError = require('http-errors');
var express = require('express');
var bodyParser = require('body-parser')
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var productsRouter = require('./routes/products');

var testAPIRouter = require("./routes/testAPI");

var authUtils = require('./utils/authUtils');


var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json())



//middleware for auhtentication and authorization
app.use(async (req, res, next) => {
  var apiUrl = req.originalUrl;
  var httpMethod = req.method;
  req.session = {};
  
  if (authUtils.isNewSessionRequired(httpMethod, apiUrl)) { //check if new session is required
    req.newSessionRequired = true;
  } else if (authUtils.isAuthRequired(httpMethod, apiUrl)) {//authorization requrired
    //get the JWT from the header and verify it
    let authHeader = req.header('Authorization');
    let sessionID = authHeader.split(' ')[1];
    if (sessionID) {
      let userData = authUtils.verifyToken(sessionID);
      if (userData) {
        req.session.userData = userData;
        req.session.sessionID = sessionID;
      }
      else {
        return res.status(401).send({
          ok: false,
          error: {
            reason: "Invalid Sessiontoken",
            code: 401
          }
        });
      }
    } else {
      return res.status(401).send({
        ok: false,
        error: {
          reason: "Missing Sessiontoken",
          code: 401
        }
      });
    }
  }
  next();
})



app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use("/testAPI", testAPIRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;