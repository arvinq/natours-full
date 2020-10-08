const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

//this is just a test route for the views
exports.base = (req, res) => {
  res.status(200).render('base', {
    //passing in variables (locals) to the pug file.
    title: 'Exciting tours for adventurous people',
    tour: 'The Forest Hiker',
    user: 'Jonas',
  });
};

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template in overview.pug
  // 3) Render that template using the tour data from step 1
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) get the data, for the requested tour (including reviews and guides)
  // in here we populate a virtual field reviews (see tourModel) and specify
  // the fields that will be shown by the query.
  const { slug } = req.params;
  const tour = await Tour.findOne({ slug }).populate({
    path: 'reviews',
    fields: 'review, rating, user',
  });

  if (!tour) {
    return next(new AppError('There is no tour found with that name.', 404)); //404 not found
  }

  // 2) build template
  // 3) render template using data from step 1
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res, next) => {
  if (!req.cookies.jwt) {
    res.status(200).render('login', {
      title: 'Log into your account',
    });
  } else {
    return next();
  }
};

// we don't have to pass in the user because its already passed by protect to res.locals (see authController.protect)
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account information',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  // 2) Find tours with the returned IDs from the bookings
  const tourIDs = bookings.map((el) => el.tour); //bookings.map((el) => { return el.tour; });

  //will select all the tours, which have an ID that is in the toursIDs array.
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'Your Tours Booked',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  //req.user comes from protect
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true, //always return the resulting object updated.
      runValidators: true, //run schema validators.
    }
  );

  if (!updatedUser) {
    return next(new AppError('Error updating our user.', 400));
  }

  //we get the updated user and pass the user.
  res.status(200).render('account', {
    title: 'Your account information',
    user: updatedUser,
  });
});

exports.alerts = (req, res, next) => {
  //from bookingController, we added alert in our query string in success url.
  const { alert } = req.query;
  console.log(req.query.alert);
  //should the webhook is called a little bit after the success url is called, we need this message to notify the user of this instance.
  if (alert === 'booking') {
    res.locals.alert =
      "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediately, please come back later.";

    next();
  }
};
