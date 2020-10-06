const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

//creating a schema
// const tourSchema = new mongoose.Schema({
//   //basic way of defining a schema
//   name: String,
//   rating: Number,
//   price: Number,
// });

//creating a schema
const tourSchema = new mongoose.Schema(
  {
    //schema definition
    //all built-in validators is of array form with message when value is not valid
    //and val in custom validators are the values inputted by the user into the current doc
    slug: String, //temporary field for slugifying texts
    name: {
      //schema type options
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have equal or less than 40 characters'],
      minlength: [10, 'A tour name must have equal or more than 10 characters'],
      // just testing how to use the validator package imported
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        //validator that only accept what is defined in [values]
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, //e.g 4.66 * 10 - 46.6 - round to 47 - 47/10 - 4.7
      //this setter will run everytime a new value is assigned to ratingsAverage field
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this only points to current document on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price.',
        //VALUE in the message above is the same as val passed in our validator
      },
    },
    summary: {
      type: String,
      trim: true, //will remove all the white space at the beginning and end of string
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], //array of strings
    createdAt: {
      //timestamp
      type: Date,
      default: Date.now(),
      select: false, //permanently hide this field to the output
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    // For our location property, we want it to be a GeoSpatial data and in order
    // to specify geospatial data to MongoDB that points to a certain location using
    //longitude and latitude, we basically need to create a new object with a type and coordinates:
    startLocation: {
      // GeoJSON format. This GeoJSON is not a schema type option but an embedded object,
      // and order for this to be considered geospatial data, we need type and coordinates
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], //(longitude, latitude) in order
      address: String,
      description: String,
    },
    locations: [
      //by specifying an array of objs, this will create brand new docs (embedded) inside of the parent tours
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number, // day of the tour in which people will go in this location
      },
    ],
    guides: [
      // we expect the type of each of the elements in the guides array to be a mongoDB id
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User', //create a reference to another model
      },
    ],
    // specifying square brackets in here will mean we want to embed subDocuments
    // guides: Array,
    // Use this for embedding. This will be the array of user, initially IDs as inputted in JSON Postman
    // then overwritten by actual User document if embedding is employed.
  },
  {
    //schema options
    toJSON: { virtuals: true }, //when the data is outputted as json, we include virtuals
    toObject: { virtuals: true }, //same as when the data is outputted as objs
  }
);

// in here we're adding an index on the price and ratingsAveraage with ascending and
// descending order respectively, -1 is descending order
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });
//a) 2dsphere index if the data describes real points on the Earth-like sphere
//b) 2d index if we're using fictional points on simple two dimensional plane
//In the above, we're telling mongoDB that the startLocation should be geospatial indexed to a 2D sphere

//Virtual properties. Same concept as computed property but not gonna be persisted into the db.
//we need actual func instead of arrow func to access this keyword which points to current document
tourSchema.virtual('durationWeeks').get(function () {
  //format this.any schema fields plus computation to get a new value from
  return this.duration / 7;
});

// Virtual Populate - We use this when we want to reference another object but don't want to persist it
// in the database. In here, we want reviews to be present when querying tours.
tourSchema.virtual('reviews', {
  //name of the model that we want to reference
  ref: 'Review',
  //In order to connect review to tour as a virtual field, we need to add the fields below:
  //name of the field in the other model (review) where the reference to the currentModel (tour) is stored.
  //so the tour model is ferenced by field tour in the review model
  foreignField: 'tour',
  localField: '_id',
  //localField is where the id of the tour (the one you want to have a reference to)
  //is stored in the current model which is tour.

  //so the _id is what its called in the local model and tour is what the tour is called in the review's model
});

// DOCUMENT MIDDLEWARE:  runs before or after .save() and .create()
// this is mainly for the manipulation of documents when the doc is being saved and/or created.
// doc(post) and next(pre, post) are accessible. This is only acces sible on create and not update
// pre save hooks
tourSchema.pre('save', function (next) {
  //slugifying a text means making it in kebab case with all lower case as degined in the option
  this.slug = slugify(this.name, { lower: true }); //this is the current doc
  next();
});

/* This pre middleware is for embedding the user documents into the tour documents.
//This will only work on creating a new Tour document because updating a tour with embedded user
//is harder to implement because User is tightly coupled with Tour and so every user update, we will
//check each of the tour if the tour containts the user.
//because Promise.all is awaited since its a promise, we need to async to the main callback
tourSchema.pre('save', async function (next) {
  //get the user document for each user ids in the guide by using a findById query using the User model
  //executing findByIds on each of the IDs will return a promise and assign the array of promises to var.
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));

  //Now we need to run all of the guidesPromises at the same time.
  //And overwrite the array of ids with array of user documents.
  this.guides = await Promise.all(guidesPromises);
  next();
});
*/

// tourSchema.pre('save', function (next) {
//   console.log('Will save the document...');
//   next();
// });

// // post save hook
// tourSchema.post('save', function (doc, next) { //doc is the document saved
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE: runs either before (pre) or after (post) queries like find() and findOne().
// instead of processing documents, we're processing queries
// pre find hook. this is executed before the queryObj is awaited in controller.
// and it will match all queries with a find (findOne,...) as stated in the regex
tourSchema.pre(/^find/, function (next) {
  //this here is now a query object
  this.find({ secretTour: { $ne: true } });

  //assigning a property to the this object bec. ThiS is essentially an object of its own
  this.start = Date.now();
  next();
});

//If we want to implement populate to reference our users for our guide,
//we'd have to do the populate here in our query object 'this', to target every find.
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt', //don't display __v and passwordChangedAt
  });

  next();
});

//post find hook. will run after the query has returned
//in post find hook we have access to all of the docs that will return from the query
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds...`);
  // console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE - allows us to add hooks before and after an aggregation happens
/* commenting because this conflicts to geoNear
tourSchema.pre('aggregate', function (next) {
  //this points to the current aggregation object. this.pipeline() to get the agg. obj
  // in here, in order to manipulate agg object, we add a new stage,
  // $match in this case to remove the secretTour in our agg.
  this.pipeline().unshift({
    //unshift and shift to add an object at the beginning and end of an array respectively.
    $match: { secretTour: { $ne: true } },
  });
  console.log(this.pipeline());
  next();
});
*/

//creating model rom the schema
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

/** FOR TESTING
//creating a document from the model
const testTour = new Tour({
    name: 'The Park Camper',
    price: 997,
  });
  
  //saving the model to the database
  testTour
    .save()
    .then((doc) => {
      console.log(doc);
    })
    .catch((err) => {
      console.log('Error:', err);
    });
*/
