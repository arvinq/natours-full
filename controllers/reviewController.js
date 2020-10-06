const Review = require('../models/reviewModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// reqs inputs
// .body : object input { key: value }
// .params.id or params.tourId :  URL or route/<value>
// .query : url strings /?key=value pairs

/*** GET ALL REVIEWS ***/
exports.getAllReviews = factory.getAll(Review);
/*
exports.getAllReviews = catchAsync(async (req, res, next) => {
  //if there's a tour Id then, we will have tourFilter object inside our find() below
  //now filtering all of the reviews for a specific tour that matches the tour id.
  //Else, we will pass an empty tourFilter querying all of the reviews.
  let tourFilter = {};
  if (req.params.tourId) tourFilter = { tour: req.params.tourId };

  // EXECUTE QUERY
  // we now create a a more generic class in APIFeatures
  // and pass in a query object coming from find and the req.query
  const features = new APIFeatures(Review.find(tourFilter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  //and then execute the queryObj which is .find()
  const reviews = await features.queryObj;

  res.status(200).json({
    status: 'SUCCESS',
    results: reviews.length,
    data: { reviews },
  });
});
*/

//nested routes
//POST /tour/xtourxxxidx/reviews
//GET /tour/xtourxxxidx/reviews
//GET /tour/xtourxxxidx/reviews/xreviewxxxidx

// This middleware is to aid the createReview function by manipulating req.body
// and adding in the required values from nesting tour route with review route.
exports.setTourUserIds = (req, res, next) => {
  //Allow nested routes - this is to allow us to create a review on a tour using the current user logged in.
  //if there are no tour/user id or body inside req body of create Review,
  //we assign whats in url's params into req.body
  if (!req.body.tour) req.body.tour = req.params.tourId; //from /:tourId
  if (!req.body.user) req.body.user = req.user.id; //the current user logged in due to protect

  next();
};

/*** GET REVIEWS ***/
exports.getReview = factory.getOne(Review);

/*** CREATE REVIEWS ***/
exports.createReview = factory.createOne(Review);
/*
exports.createReview = catchAsync(async (req, res, next) => {
  const review = await Review.create(req.body);

  res.status(201).json({
    status: 'SUCCESS',
    data: { review },
  });
});
*/
/*** UPDATE REVIEWS ***/
exports.updateReview = factory.updateOne(Review);

/*** DELETE REVIEWS ***/
exports.deleteReview = factory.deleteOne(Review);
