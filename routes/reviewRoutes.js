const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

//by default, each router only have access to the parameters of their specific routes.
//by including the mergeParams option, we get access to the tourId which is inside tourRoutes
const router = express.Router({ mergeParams: true });

// for authenticated users only,
router.use(authController.protect);

//POST /tour/xtourxxxidx/reviews
//GET /tour/xtourxxxidx/reviews
//If in case a logged user want to add a review and accesses /:tourId/xxx/reviews from tourRoutes,
//it will be redirected to reviewRoutes' / below with the tour id being accessible bec of mergeParams:
router.route('/').get(reviewController.getAllReviews).post(
  authController.restrictTo('user'), //for ordinary users only, no tour guides and admin
  reviewController.setTourUserIds, //call the nesting first before createReview
  reviewController.createReview
);

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

// this router is required in mounting our routes in app.js so we need
// to export our router obj.
module.exports = router;
