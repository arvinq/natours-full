const AppError = require('../utils/appError');

/*** DEVELOPMENT ERROR ***/
const sendErrorDev = (err, req, res) => {
  console.log(err);
  //if it's an API request, we trigger the normal json returned
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    // else we render the error website passing in title.
    console.error('ERROR', err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong.',
      msg: err.message,
    });
  }
};

/*** PRODUCTION ERROR ***/
const sendErrorProd = (err, req, res) => {
  console.log(err);
  // a) API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    // e.g. user trying to access route that doesn't exist, trying to input invalid data
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
      // Programming or other unknown error: don't leak error details
    }
    // 1.) Log error
    console.error('ERROR', err);

    // 2.) Send generic message
    return res.status(500).json({
      status: 'Error',
      message: 'Something went wrong!',
    });
  }
  // b) RENDERED WEBSITE
  // Operational, trusted error: send message to client
  // e.g. user trying to access route that doesn't exist, trying to input invalid data
  if (err.isOperational) {
    console.log(err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong.',
      msg: err.message,
    });
    // Programming or other unknown error: don't leak error details
  } else {
    // 1.) Log error
    console.error('ERROR', err);

    // 2.) Send generic message
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong.',
      msg: 'Please try again later',
    });
  }
};

/*** HANDLING MONGOOSE ERROR ***/
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/*** HANDLING MONGODB ERROR ***/
const handleDuplicateFieldsDB = (err) => {
  //using match func to get matching in string using regular expression.
  //regular expression here matches text between quotes.
  //js always enclosed regex between /<regexp>/
  //   const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  // In here, we're using Object.values since we get a different err obj from what Jonas got.
  //Object.values will enumerate the value of an object into an array that we can access.
  // we use keyValue property because it contains the duplicate value passed into mongodb.
  const dupValue = Object.values(err.keyValue)[0];
  const message = `Duplicate field value: ${dupValue}. Please use another value.`;
  return new AppError(message, 400);
};

/*** HANDLING MONGOOSE VALIDATION ERROR ***/
const handleValidationErrorDB = (err) => {
  //In here Object.values is used to loop over the elements of the error object.
  //Now we extract each of the elements message and join it
  const errMessage = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errMessage.join('. ')}`;
  return new AppError(message, 400);
};

/*** HANDLING JWT USER AUTH ERROR ***/
const handleJWTError = () => {
  //unauth error
  return new AppError('Invalid token. Please login again', 401);
};

/*** HANDLING JWT ERROR FOR EXPIRED TOKENS ***/
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log back in.', 401);
};

/*** OUR MAIN ERROR CONTROLLER ***/
module.exports = (err, req, res, next) => {
  // console.log(err.stack); for printing error stacktrace
  err.statusCode = err.statusCode || 500; //default internal server error
  err.status = err.status || 'ERROR';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // not a good practice to overwrite the arguments of a function, so we're going
    // to assign destructured err to a let var error.
    // this is apparently deep copy.
    // let error = { ...err };
    // error.message = err.message;

    // so we can also use this instead of destructuring above:
    let error = Object.create(err);

    // in here's we want to create an instance of AppError to have a meaningful error message in production
    //Invalid ID
    if (err.name === 'CastError') error = handleCastErrorDB(error);

    //Duplicate name
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);

    //mongoose validation errors
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

    //wrong token when requesting for all tours on logged users
    if (err.name === 'JsonWebTokenError') error = handleJWTError();

    //if token has expired
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
