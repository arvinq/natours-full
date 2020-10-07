const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const Email = require('../utils/email');

// reqs inputs
// .body : object input { key: value }
// .params.id or params.tourId :  URL or route/<value>
// .query : url strings /?key=value pairs

// when creating function, (param) => {implementation}
// shortcut of ({ id: id }) is ({ id })
// For signing the token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  //Refactored version 2: see this whole cookieOPtion inside res.cookie below
  // const cookieOption = {
  //   expires: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  //   ),
  //   httpOnly: true,
  //   secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  // };

  //expires: the browser/client will delete this cookie on the expiration date specified
  //(days * n hours in a day * n minutes in an hour * n seconds in minutes * n milliseconds in seconds)
  //httpOnly: cookie cannot be access or modified by browser / client, super strong way of dealing with cookies.

  //secure: only send cookies on secure connection (https), we only want this in prod
  //however, even if we're in prod, doesn't mean the connection is secure. Not all deployed apps are set to https.
  //in express, we have a secure property in req. When the connection is secure, this returns true.
  // if (process.env.NODE_ENV === 'production') {
  // However, in Heroku, this doesn't work, bec heroku proxies redirects and modifies all incoming request before they reach the app.
  //for this to work, we need to add this and trust proxies, see app.js:
  // if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
  //   cookieOption.secure = true;
  // }
  // Refactored version 1: (we can add this secure above in cookieOption object, then have all of the cookieOption object {...} be inside res.cookie below, instead of cookieOption var in there.)
  // cookieOption.secure =
  //   req.secure || req.headers['x-forwarded-proto'] === 'https';

  //creating and sending cookie to the response
  // res.cookie('jwt', token, cookieOption);
  //Refactored Version 3:
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  //remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'SUCCESS',
    token,
    data: { user },
  });
};

// reqs inputs
// .body: object input { key: value }
// .params.<var for value defined in router>: url string /<param value in postman>
// .query: url strings /?key=value pairs

//user signup
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    //only allow data that we actually need into the new user
    //to prevent users from adding other fields in req.body
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  //now we create our JWT that we will pass to user since user will be signed in upon signing up.
  // V1 const token = signToken(newUser._id);

  //now by sending the token to the user, we are essentially logging her back in.
  // res.status(201).json({
  //   status: 'SUCCESS',
  //   token,
  //   data: { user: newUser },
  // });

  // We would want to send the welcome email to the user signing up, hence we have it here.
  // The url is pointing to the accounts page because in welcome.pug, the ahref, upload user photo, is connected to updating user's photo.
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  // wait for the email to be sent before creatingSendToken hence the await

  createSendToken(newUser, 201, req, res);
});

// user login
exports.login = catchAsync(async (req, res, next) => {
  // use ES6 Destructuring since email and password var has the same name as in our object
  const { email, password } = req.body;

  // 1) Check if email && password exist in the request
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if the user exists && password is correct
  // this find will not contain the password because we tagged the password as select: false in the model
  // but since we need to check the correctness of the password, we do select here.
  // shortcut of ({ email: email });
  const user = await User.findOne({ email }).select('+password');

  //if no user or wrong password then error
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password!', 401)); //401 unauth
  }

  // 3) If everything ok, send Json Web Token to client
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'SUCCESS',
  //   token,
  // });
  createSendToken(user, 200, req, res);
});

//workaround for logging out. we assign a dummy value on the jwt token
//have it expire in 10 seconds.
exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedout', {
    //make the cookie stay for a second then delete so that when user clicks the login again.,
    //they wont have an issue in the pages.
    expires: new Date(Date.now() + 1 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'SUCCESS' });
};

//check if the user is logged in, This is usually used before triggering a
//tour route like getAllTours. This is to prevent unauthorised user to trigger tour routes.
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting the token and check if it exist
  // its a common practice to pass the token via req.headers using key: value
  // Authorization : Bearer <token>
  let token;
  const { authorization } = req.headers;

  //if auth doesn't exist and auth doesn't starts with Bearer
  if (authorization && authorization.startsWith('Bearer')) {
    token = authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    //if there are no tokens in the auth headers then let's take a look at cookies sent in our request.
    //this is to authenticate users based on tokens sent via cookies
    token = req.cookies.jwt;
  }

  //if token doesn't exists
  //401 unauth
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  // In here, we promisify our jwt.verify so that it will return a promise and we can use async/await.
  // this is because verify function calls a callback after verifying
  const decodedPayload = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // 3) Check if user still exists
  const currentUser = await User.findById(decodedPayload.id); //shortcut of ({ _id: decodedPayload.id });
  //If user using the token does not exists anymore, we throw this error below:
  if (!currentUser) {
    return next(new AppError('The user under this token no longer exist', 401));
  }

  // 4) Check if user changed password after the JWT (token) was issued
  if (currentUser.changesPasswordAfter(decodedPayload.iat)) {
    return next(
      new AppError('User recently changed password. Please login again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE.
  // In here, since user has now logged in, req will have the user object
  req.user = currentUser;
  res.locals.user = currentUser; //same as seend in isLoggedIn
  next();
});

// If we want to pass arguments into our middleware functions, we can create
// a wrapper function which will then return the middleware function.
// ES6 param syntax of receiving random values when passing in arbitrary number of values.
// this will create an array called roles containing the allowed users.
exports.restrictTo = (...roles) => {
  // return the middleware function
  return (req, res, next) => {
    //if user's role is not included to allowed roles, we throw an error
    if (!roles.includes(req.user.role)) {
      return next(
        //forbidden
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

//forgot password option
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404)); //not found
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  //to save the properties we defined inside createPasswordResetToken
  //we are passing this option to save so that we don't have to validate the availability of the user's fields
  //and only save the data that we need to save.
  await user.save({ validateBeforeSave: false });

  // 3) Send it back to user's email
  //we've abstracted everything into our new Email handler.
  // const message = `Forgot your password? Submit a PATCH request with your new password and
  // passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    // old way of sending emails
    // use our email middleware to trigger email sending
    // await sendEmail({
    //   email: req.body.email,
    //   subject: 'Your password reset token (valid for 10 minutes)',
    //   message,
    // });

    //to get the host, we need req.get('host')
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    //new way
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // if there's an error encountered when sending the email,
    // we want to reset both the token and the expires property of the user
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    //Error happened in the server.
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

// resetting password. Mostly invoked on url sent to user's email
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token on the request param in the reset url.
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  //we will know that the token sent to the user is equal to the tokens saved by
  //finding the user whose hashed token is saved.
  // we also need to check if the token hasn't expired yet or if the expiration of
  // the resetToken is greater than NOW. if it is, then a user will be returned to us.
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) Set new password if token has not expired and there is a user.
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400)); //bad request
  }

  // now we set the password and passwordConfirm if we got a user.
  // We also remove the passwordReset values in DB
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  //now we always want to use findOne and then save instead of findOneAndUpdate because we always want to
  //run all the validators and our save middleware functions for encrypting our password.
  await user.save();

  // 3) Update the changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'SUCCESS',
  //   token,
  // });
  createSendToken(user, 200, req, res);
});

// updating password for logged in users
exports.updatePassword = catchAsync(async (req, res, next) => {
  // we always want to ask the user's password before updating it.
  // just to make sure he is who he is.

  // 1) Get the user from the collection
  //user.password is not available since its select false in our schema.
  //we need to select+ our password to add it in our user instance
  const user = await User.findById(req.user.id).select('+password');

  // 2) check if POSTed current password is correct
  //compare our old password from the request with the password in user's instance
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401)); //unauth
  }

  // 3) if so, then update the password
  //if the old password is correct, we save the new password and passwordConfirm
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //we want the validation of passwordConfirm, hence we didn't turned off the validateBeforeSave
  // don't use User.findByIdAndUpdate bec it will NOT work as intended:
  // a. passwordConfirm validation will not work.
  // b. user pre middleware will not work

  // 4) log user in, send JWT
  //log the user back in, passing a new token.
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'SUCCESS',
  //   token,
  // });
  createSendToken(user, 200, req, res);
});

// Only for rendered pages. No Errors!
// we removed our catchAsync in here because we want to handle the errors ourselves
// and just hit return next()
exports.isLoggedIn = async (req, res, next) => {
  // 1) Getting the token and check if it exist

  if (req.cookies.jwt) {
    try {
      //if there are no tokens in the auth headers then let's take a look at cookies sent in our request.
      //this is to authenticate users based on tokens sent via cookies

      // 2) Verification token
      // In here, we promisify our jwt.verify so that it will return a promise and we can use async/await.
      // this is because verify function calls a callback after verifying
      const decodedPayload = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 3) Check if user still exists
      const currentUser = await User.findById(decodedPayload.id); //shortcut of ({ _id: decodedPayload.id });
      //If user using the token does not exists anymore, then we just move on to the next middleware
      if (!currentUser) {
        return next();
      }

      // 4) Check if user changed password after the JWT (token) was issued
      if (currentUser.changesPasswordAfter(decodedPayload.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // In here, since user has now logged in, we will pass the currentUser to the locals.
      // Using res.locals then .<any variable name> so that the variable and
      //its value is accessible to our web templates. This is like passing data
      //into the templates using render function in response.
      res.locals.user = currentUser;
      next();
    } catch (err) {
      return next();
    }
  } else {
    //if no cookie, or jwt token. then no logged in user.
    next();
  }
};
