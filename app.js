/***
 * Everything related to express is in here
 */

//it is a convention to use app.js for express configuration
// const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const csp = require('express-csp');
const compression = require('compression');

// our own modules
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

// Start express app
//will add a bunch of functions from express into our app var
const app = express();

//built-in to express. Since heroku acts as proxy it will then redirect or modify reqs before coming into our app.
//to make req.secure work, we need to trust proxies.
app.enable('trust proxy');

//tell express what template engine we're going to use.
//our pug templates are views in express.
app.set('view engine', 'pug');

//using the built in path module from express here,
//to define which folder our views/templates are located in.
// OLD app.set('views', `${__dirname}/views`);
// console.log(`${path.join(__dirname, 'views')}`);
app.set('views', path.join(__dirname, 'views'));

// Serving static files
//using a built-in express middleware to server static files.
//in our browser, we access our page.html residing in public folder
//directly because the root is then converted to /public.
//Try localhost:3000/overview.html in browser
// OLD app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

/*************************** GLOBAL MIDDLEWARE ******************************/
//middleware - function that can modify an incoming request data.
//step that the request goes through while being processed.

// Set security HTTP Headers
//in app.use, we always need function not a function call.
//in here, we are invoking a helmet function where it will return a function.
//this helmet will add security http headers to make the browser act on it.
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", 'https:', 'http:', 'unsafe-inline'],
    },
  })
);
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       baseUri: ["'self'"],
//       fontSrc: ["'self'", 'https:', 'data:'],
//       scriptSrc: ["'self'", 'https://*.cloudflare.com'],
//       scriptSrc: ["'self'", 'https://*.stripe.com'],
//       frameSrc: ["'self'", 'https://*.stripe.com'],
//       objectSrc: ["'none'"],
//       styleSrc: ["'self'", 'https:', 'unsafe-inline'],
//       upgradeInsecureRequests: [],
//     },
//   })
// );

//https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/learn/lecture/15064524#questions/12063924

// csp.extend(app, {
//   policy: {
//     directives: {
//       'default-src': ['self'],
//       'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
//       'font-src': ['self', 'https://fonts.gstatic.com'],
//       'script-src': [
//         'self',
//         'unsafe-inline',
//         'data',
//         'blob',
//         'https://js.stripe.com',
//         'https://api.mapbox.com',
//       ],
//       'worker-src': [
//         'self',
//         'unsafe-inline',
//         'data:',
//         'blob:',
//         'https://js.stripe.com',
//         'https://api.mapbox.com',
//       ],
//       'frame-src': [
//         'self',
//         'unsafe-inline',
//         'data:',
//         'blob:',
//         'https://js.stripe.com',
//         'https://api.mapbox.com',
//       ],
//       'img-src': [
//         'self',
//         'unsafe-inline',
//         'data:',
//         'blob:',
//         'https://js.stripe.com',
//         'https://api.mapbox.com',
//       ],
//       'connect-src': [
//         'self',
//         'unsafe-inline',
//         'data:',
//         'blob:',
//         'https://api.mapbox.com',
//         'https://events.mapbox.com',
//       ],
//     },
//   },
// });

// Development logging
// for logging the request on the console
// this prints to console the log of the request
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit request from same API
//This is to prevent denial of service and bruteforce attacks
//allow 100 requests from same IP in 1hr.
//(see limit in Headers in postman after executing a req)
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // (1hr) 60 mins * 60 secs * 1000 milliseconds
  message: 'Too many requests from this IP. Please try again in an hour!',
});
//mount the limiter to all of the /api routes
app.use('/api', limiter);

// Body parser, reading/parsing data from the body into req.body
// in here, we specify that the request needs to be in json,
// and that the body needs to be at most 10kb, any excess will not be accepted
app.use(express.json({ limit: '10kb' }));

//to parse data coming from url encoded form. This is for traditional way of submitting the amendment coming from browser's form element and parsing data passed into req's body. extended is for handling passed complex data (see account.pug)
app.use(
  express.urlencoded({
    extended: true,
    limit: '10kb',
  })
);
//cookie-parser - Since the jwt is now passed in the browser when the user logs in,
//it will be saved by the browser as a cookie, and will be used in the authentication
//when a request is sent from the browser. we use cookie parser in order to parse this cookies.
//this will create a cookie var in our request.
app.use(cookieParser());

// Perfect place for doing Data Sanitization is after reading data from body into req.body
// Data sanitization against NoSQL query injection
// example of NoSQL query is when attacker knows the password but not the email,
// he can put this query in the email field: "email": {"$gt": ""},
// this sanitizer will filter out mongo operators ($, .) inside req.body, req.params and other query string
app.use(mongoSanitize());

// Data sanitization against XSS
// will sanitize any user input from malicious html with JS input
app.use(xss());

// Preventing Parameter Pollution with HPP (HTTP Parameter Pollution)
// we also want to whitelist some parameters if we want some query parameters to appear twice
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// creating our own middleware
// it is mandatory to always call next() so that we pass our
// req and res obj to the next middleware
// app.use((req, res, next) => {
//   console.log('Hello from the middleware - this is a sample middleware');
//   next();
// });

//this will use the middleware function that will compress all the text reponses sent to client.
app.use(compression());

// Test middleware
//modifying the request by means of middleware
app.use((req, res, next) => {
  //we can randomly add a property on the request.
  //In here we added a time property named, requestTime
  req.requestTime = new Date().toISOString(); //gets the current date and converts it
  next();
});

/*************************** ROUTE HANDLERS / CONTROLLERS ******************************/

// /* **********
// GET ALL TOURS
// ********** */
// now copied into its own module / file. Please see tourRoutes.js inside routes

// /* **********
//   USER ROUTES
// ********** */
// now copied into its own module / file. Please see userRoutes.js inside routes

/*************************** ROUTES ******************************/
// V1 routes
// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);

// specifying a param/placeholder in the route. If the param is optional,
// we put a question mark like the one below
// app.get('/api/v1/tours/:id?', .....
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// V2 routes
//we can use the route method and chain each of the http method.
// app.route('/api/v1/tours').get(getAllTours).post(createTour);
// app.route('/api/v1/tours/:id').get(getTour).patch(updateTour).delete(deleteTour);

// app.route('/api/v1/users').get(getAllUsers).post(createUser);
// app.route('/api/v1/users/:id').get(getUser).patch(updateUser).delete(deleteUser);

// V3 Routes
// In here we are creating a subApplication which is
// middleware router for us to mount our routes into it
// const tourRouter = express.Router();
// const userRouter = express.Router();

// then use our routers to call the routes, but we need to
// mount the routers which we have done below
// tourRouter.route('/').get(getAllTours).post(createTour);
// tourRouter.route('/:id').get(getTour).patch(updateTour).delete(deleteTour);

// userRouter.route('').get(getAllUsers).post(createUser);
// userRouter.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

//View Template Routes --- now copied into the viewRoutes.js
//for rendering pages in the browser, we simply retrieve the value set to our root. and if the value is a
//handler func, we can use render to render the template referencing the name that we pass in.
// app.get('/', (req, res) => {
//   res.status(200).render('base', {
//     //passing in variables (locals) to the pug file.
//     title: 'Exciting tours for adventurous people',
//     tour: 'The Forest Hiker',
//     user: 'Jonas',
//   });
// });

// app.get('/overview', (req, res) => {
//   res.status(200).render('overview', {
//     title: 'All Tours',
//   });
// });

// app.get('/tour', (req, res) => {
//   res.status(200).render('tour', {
//     title: 'The Forest Hiker Tour',
//   });
// });

//API Routes
//mounting the middleware routers to the /routes
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//--- Beyond this point, we are sure that the route being accessed by the user is
//not caught by the current routers we have in our app.

//ALL will run on all the verbs and/or httpMethods, * will handle all url,
//originalUrl is the url requested by the user
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'FAIL',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  //v1 - we create a new error instance to be passed to our global error middleware handler
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.statusCode = 404;
  // err.status = 'FAIL';

  //v1 - everytime we pass something in next, it will assume that we are passing an error.
  //so it will automatically go to our global error handler even if there are middleware in between
  //next(err);

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//our middleware error handler is now copied to errorController.js and is
//just imported as globalErrorHandler
app.use(globalErrorHandler);

module.exports = app;
