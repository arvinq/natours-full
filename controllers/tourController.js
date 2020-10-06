const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// reqs inputs
// .body : object input { key: value }
// .params.id or params.tourId :  URL or route/<value>
// .query : url strings /?key=value pairs
// .file : contains file uploads from body > form-data

/****************************
PHOTO UPLOAD
****************************/
/*
const multerStorage = multer.diskStorage({
  //destination is a callback function, that has access to request, to the currently uploaded file object and to a callback function cb (like next). To actually specify the destination, cb is called inside destination passing in the error and the destination of the file uploaded.
  destination: (req, file, cb) => {
    cb(null, 'public/img/users');
  },
  //same with destination above, filename is a callback function that has req, file and cb access. To specify the filename, CB is called inside passing in the constructed filename
  filename: (req, file, cb) => {
    //user-<user id>-<timestamp>.jpg
    const ext = file.mimetype.split('/')[1];
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});
*/
//since we're doing imageProcessing via Sharp, its best to not save the file to the disk but instead save it to memory. hence we just want to do this and remove the diskStorage function above. This way, the image will then be stored as a buffer.
const multerStorage = multer.memoryStorage();

// filter's goal is to test if the uploaded file is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image, please upload only images.', 400), false);
  }
};

// configure multer upload
//dest is the destination where the images will be uploaded.
//if we don't have dest, image will be saved inside memory buffer and not on disk
const upload = multer({
  //{ dest: 'public/img/users' }
  storage: multerStorage,
  fileFilter: multerFilter,
});

//creating a middleware in here that uses the multer object for uploading/updating multiple images using the name of the field (in the form that will upload the image ) which will hold the image to upload. This middleware will put the info of the file into the req object. (req.file)

//uploading mix of images for multiple schema fields. We need to create separate objects for each of the fields. This will produce req.files as oppose to single.
exports.uploadTourImages = upload.fields([
  //each of the objects below is an array of its own. so for instance, if we're going to retrieve the imageCover, we would have to use the image at index 0
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

// upload.single('image'); //upload 1, produce req.files
// upload.array('images', 3); //upload 3 with the same name reference field in model. will produce req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);

  if (!req.files || !req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  // since this route is used mainly for tour updates, we are sure that id of tour is already passed in params
  //since we want imageCover field in schema definition to have the filename once we process the image.
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  //that buffer kept in memory containing the images uploaded via Multer will then be accessible to sharp like this:
  await sharp(req.files.imageCover[0].buffer) //all of the objects in side req.files are array in itself, regardless if there's multiple images handled by the field or just one.hence accessing [0] in imageCover
    .resize(2000, 1333) //wxh // resizing is as the name says, cropping the images to 2000x1333 pixels.
    .toFormat('jpeg') // convert the images always to JPEG
    .jpeg({ quality: 90 }) // defining the quality of the jpg so that it doesn't take up space
    .toFile(`public/img/tours/${req.body.imageCover}`); //writing the file to disk. writing the entire path to the file.

  // 2) Images
  req.body.images = [];
  //we hace access to the file being looped and the index of the file being processed.
  // Problem: Since the async await is inside of this foreach, program will not wait for the process to finish and jump straight to next after handling all of the files.
  //Solution: since each element in foreach returns a promise in itself, we can replace foreach with a map and save the resulting array. Which we can then do promise.all so that our system awaits this whole image processing to finish, and only then move on to the next middleware.
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer) //all of the objects in side req.files are array in itself, regardless if there's multiple images handled by the field or just one.hence accessing [0] in imageCover
        .resize(2000, 1333) //wxh // resizing is as the name says, cropping the images to 2000x1333 pixels.
        .toFormat('jpeg') // convert the images always to JPEG
        .jpeg({ quality: 90 }) // defining the quality of the jpg so that it doesn't take up space
        .toFile(`public/img/tours/${filename}`); //writing the file to disk. writing the entire path to the file.

      req.body.images.push(filename);
    })
  );

  next(); //to finish the req, res cycle
});

/****************************
GET TOP 5 HIGHEST RATED TOURS
****************************/
//limit=5&sort=-ratingsAverage,price
// If we need to get a specialized set of document, we create a middleware
// to modify our req.query
exports.getTopToursAlias = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

/************
GET ALL TOURS
************/
exports.getAllTours = factory.getAll(Tour);
/*
exports.getAllTours = catchAsync(async (req, res, next) => {
  // EXECUTE QUERY
  // we now create a a more generic class in APIFeatures
  // and pass in a query object coming from find and the req.query
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const tours = await features.queryObj;

  // SEND RESPONSE
  res.status(200).json({
    status: 'SUCCESS',
    results: tours.length,
    data: { tours },
  });
});
*/

/*************
GET TOUR BY ID
*************/
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); //same as advance usage below
/*
exports.getTour = catchAsync(async (req, res, next) => {
  //Tour.findById(...) is a shorthand of Tour.findOne({ _id: req.params.id })
  //we use id in req.params.id because it is the name defined in tourRoutes when calling getTour.
  //req.params accesses the parameters on url.

  // the populate process always happens in a query. and not in the DB
  // Populate fills up the field, guides, with actual data using the references inside our guides.
  // the basic implementation is like this one: .populate('guides');
  // for a more advance usage, we can specify an object with options inside the populate.
  // but now to target all of our finds, we can do this in query middleware.
  // .populate({
  //   path: 'guides', //path property is the field that we want to populate
  //   select: '-__v -passwordChangedAt', //don't display __v and passwordChangedAt
  // });

  // however, if we want to populate the virtual reviews field we can do the one below:
  const tour = await Tour.findById(req.params.id).populate('reviews');

  //if tour is null, then we throw an error to next
  //return quickly to avoid sending 2 nexts
  if (!tour) {
    return next(new AppError('No tour with specified ID', 404));
  }

  res.status(200).json({
    status: 'SUCCESS',
    data: { tour },
  });
});
*/

/************
CREATE A TOUR
************/
exports.createTour = factory.createOne(Tour);
/*
exports.createTour = catchAsync(async (req, res, next) => {
  // const newTour = new Tour({ })
  // newTour.save()
  // where newTour is the prototype object of Tour model: model.prototype.save()

  //shortcut of the above code. Calling the create and save
  //directly on the Tour model instead of creating a doc (model.prototype) and then save()
  //.create returns a promise hence await is used and assigned to newTour
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'SUCCESS',
    data: { tour: newTour },
  });
});
*/

/************
UPDATE A TOUR
************/
exports.updateTour = factory.updateOne(Tour);
/*
exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true, //option saying that findByIdAndUpdate will always return the query obj
    runValidators: true, //option saying to perform validator when applying update
  });

  //if tour is null, then we throw an error to next
  //return quickly to avoid sending 2 nexts
  if (!tour) {
    return next(new AppError('No tour with specified ID', 404));
  }

  res.status(200).json({
    status: 'SUCCESS',
    data: { tour },
  });
});
*/

/************
DELETE A TOUR
*************/
//call deleteOne factory and pass in Tour model
exports.deleteTour = factory.deleteOne(Tour);
/*
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  //if tour is null, then we throw an error to next
  //return quickly to avoid sending 2 nexts
  if (!tour) {
    return next(new AppError('No tour with specified ID', 404));
  }

  //204 means deleted, so no data is returned
  res.status(204).json({
    status: 'SUCCESS',
    data: null,
  });
});
*/

/********************
 AGGREGATION PIPELINE
 *******************/
// we can use aggregation pipeline to group results, and / or compute for
// a result that is relevant on the application
exports.getTourStats = catchAsync(async (req, res, next) => {
  //we need to await this, because it will only return the aggregate obj and not the result just like FIND
  const stats = await Tour.aggregate([
    //array of stages in the pipeline, each of the stages is an object
    {
      //format - $aggOperator: { schemaField : {operator: value to compare to schemaField} }
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        // id is used to separate groups using the tourModel's fields,
        // but if we want to just calculate for all the group, then we assign null here
        // _id: null,
        _id: { $toUpper: '$difficulty' },
        // FORMAT: fieldNameToDisplay: { $operator: '$schemaFieldName<to get the value>' }
        numTours: { $sum: 1 }, //as the document is read, so is numTours count, hence 1
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      //use the field name that we defined in group (fieldNameToDisplay)
      $sort: { avgPrice: 1 }, //1 for ascending, -1 for descending
    },
    {
      //using the field name that we defined in the group,
      //and since the difficulty is now assigned to _id, we use it here
      $match: { _id: { $ne: 'MEDIUM' } },
    },
  ]);

  res.status(200).json({
    status: 'SUCCESS',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      //unwind is deconstructing an array and puttin each of array elem on its own document
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 }, //add for each of the tours on a specific month
        tours: { $push: '$name' }, //pushin will add each of the doc to an array
      },
    },
    {
      //adds a field and assign a value
      $addFields: {
        month: '$_id',
      },
    },
    {
      //project removes a field if it is assigned a 0 value, else 1 to show
      $project: {
        _id: 0,
      },
    },
    {
      $sort: { numTourStarts: -1 }, //in descending
    },
    {
      $limit: 12, //limits the number of output
    },
  ]);

  res.status(200).json({
    status: 'SUCCESS',
    data: { plan },
  });
});

// Implementing Geo-Spatial query
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/33.730557,-117.855580/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  //use destructuring to get all of the vars from params. See getToursWithin route re: var names.
  //also use destructuring to assign var for latlng
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // the distance converted to radians
  // to get the radians, we need to divide our distance by the radius of the earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  // Query for startLocation field in tour because it holds the geospatial point where each tour starts.
  // we use operator geoWithin, which finds documents within a certain geometry. In our case, we can use
  // distance and center values to get all the tour document that has a startLocation within the
  // distance radius from our center (current location).
  // centerSphere operator takes in an array of the coordinates and of the radius.
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, //reversed order for lng,lat
  });

  res.status(200).json({
    status: 'SUCCESS',
    results: tours.length,
    data: { data: tours },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  //use destructuring to get all of the vars from params. See getToursWithin route re: var names.
  //also use destructuring to assign var for latlng
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  //aggregation pipeline for calculations. For geospatial aggregation,
  //there's only one single stage, geoNear which always needs to be the first stage
  const distances = await Tour.aggregate([
    {
      // geonear require that atleast one of our fields contains a geoSpatial index.
      // which we have already, startLocation. Since we only have one, geoNear will use this automatically.
      // but if we have multiple geoSpatial indexed fields, we need to specify the field to use
      // for calculations via key parameter in geoNear.
      $geoNear: {
        // near is the point from where to calculate the distances to all the startLocations
        near: {
          // geoJSON, just like how we defined our locations. see tourSchema
          type: 'Point',
          coordinates: [lng * 1, lat * 1], //to convert to numbers.
        },
        //name of field where all the calculated distances will be stored.
        distanceField: 'distance',
        //distance will be meters, and so we want to either convert it to
        //miles or kilometers, depending on what's passed by the user.
        distanceMultiplier: multiplier,
      },
    },
    {
      //specify the fields that we want to keep
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'SUCCESS',
    data: { data: distances },
  });
});
