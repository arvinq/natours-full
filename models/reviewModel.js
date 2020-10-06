// review . rating . createdAt . ref to tour . ref to user

const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      //this is essentially the review message, misnamed by me :(
      type: String,
      required: [true, 'Review cannot be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now, //if it is made as a default, we don't call the function now()
    },
    // we're using parent referencing here because we don't know how many reviews our tour
    // and user will hold. IF it grows exponentially, we will have problem with accessing the schema.
    // and also, since it's parent referencing, these references are required.
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    //schema options. All these does, is when we have a virtual property, a field that is not stored in DB
    //but calculated using some other value, we want these to show up whenever there's an output.
    toJSON: { virtuals: true }, //when the data is outputted as json, we include virtuals
    toObject: { virtuals: true }, //same as when the data is outputted as objs
  }
);

//this index will make tour's rater to be unique users and user's rating to be just one on a tour
// now each combination of tour and user has always to be unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

//since we use referencing (parent referencing), we need this query middleware in order to
//display the user and tour details when getting all the reviews. This will add two queries,
//one for user and another for tour.
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo', //only both user's name and photo.
  });
  // Turning this populate off because in a review, its not that necessary to have a tour. only user.
  //   .populate({
  //     path: 'tour',
  //     select: 'name', //only user's name
  //   });
  next();
});

/*** STATIC METHODS ***/
// - opposite of Instance Methods found in UserModel. If Instance methods can be called on documents,
// static methods can be called on the model directly. e.g Review.calcStats. and the definition is like this:
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // console.log(tourId);
  //tourId of the tour where the review belongs to.
  //on static methods, the this keyword is pointing to the current model.
  //Aggregate is only accessible on the Model. so static method is perfect for calling aggregates.
  const stats = await this.aggregate([
    {
      //1st stage (match), get all the reviews from the tour
      $match: { tour: tourId },
    },
    {
      //2nd stage (group), calculate the stats
      $group: {
        //group by the commong field that all of the docs have in common that we want to group by
        _id: '$tour', //we group the tours, but this id is not necessary since we'll only have one tour anyway.
        nRating: { $sum: 1 }, //just add 1 rating for each tour that is matched in the first step.
        avgRating: { $avg: '$rating' }, //the avg of all ratings. to access review's rating, we need $<field>
      },
    },
  ]);
  // console.log(stats);
  // the output is below: [ { _id: 5f6f04691f4ae96e611dbb8c, nRating: 2, avgRating: 4 } ]
  // so to explain, in this aggregate, this tour id, has a rating of 2, and an average rating of 4.

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5, //default average
      ratingsQuantity: 0, //default ratings quantity
    });
  }
};

// Computing Updating tour's ratings average and quantity on Review ADD
//we call the static method above after a new review has been created.
reviewSchema.post('save', function () {
  //this keyword points to current review, and constructor to review model
  this.constructor.calcAverageRatings(this.tour); //this.constructor points to the model
});

//Computing Updating tour's ratings average and quantity on Review UPDATE AND DELETE
//In here, we can only work on findOneAndUpdate or findOneAndDelete
//the goal is to access the current review doc. this keyword is pointing to the current query.
//executing this, with findOne() will return the review document that we wanted.
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //in JS, we can create a variable on the fly for a particular object. In here, we are
  //creating a reviewDoc var so we can access it later from any query object THIS.
  this.reviewDoc = await this.findOne();
  next();
});

//but if we access calcAverageRatings to compute, we wont have the latest update because
//the query middleware above is PRE. We need the POST to have access on latest update
reviewSchema.post(/^findOneAnd/, async function () {
  //access the reviewDocect, and from reviewDocect we can access the constructor
  //we can also access the tour from the review object. this is the one we pass into calculations.
  await this.reviewDoc.constructor.calcAverageRatings(this.reviewDoc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
