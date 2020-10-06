const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
// const { populate } = require('../models/userModel');

// this deleteOne function will return the whole handler function that we had before starting from catchAsync
//in Javascript, this handler function, essentially a closure, will still have access to the value that
//that has been passed to it, even after the outer function which in this case the deleteOne has already returned.
//so calling the deleteOne function in one of the controllers will return this handler and sit there and wait
//until its finally called as soon as the corresponding route is hit.
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    //if doc is null, then we throw an error to next
    //return quickly to avoid sending 2 nexts
    if (!doc) {
      return next(new AppError('No document with specified ID', 404));
    }

    //204 means deleted, so no data is returned
    res.status(204).json({
      status: 'SUCCESS',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //option saying that findByIdAndUpdate will always return the query obj
      runValidators: true, //option saying to perform validator when applying update
    });

    //if doc is null, then we throw an error to next
    //return quickly to avoid sending 2 nexts
    if (!doc) {
      return next(new AppError('No document with specified ID', 404));
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: { data: doc },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // const doc = new Tour({ })
    // doc.save()
    // where doc is the prototype object of Tour model: model.prototype.save()

    //shortcut of the above code. Calling the create and save
    //directly on the Tour model instead of creating a doc (model.prototype) and then save()
    //.create returns a promise hence await is used and assigned to doc
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'SUCCESS',
      data: { data: doc },
    });
  });

//For those instances where we are using populate, we can pass in the populate options here.
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    //Tour.findById(...) is a shorthand of Tour.findOne({ _id: req.params.id })
    //we use id in req.params.id because it is the name defined in tourRoutes when calling getTour.
    //req.params accesses the parameters on url.

    // the populate process always happens in a query. and not in the DB
    // Populate fills up the field, guides, with actual data using the references inside our guides.
    // the basic implementation is like this one: .populate('guides');
    // for a more advance usage, we can specify an object with options inside the populate.
    // but now to target all of our finds, we can do this in query middleware.
    // .populate({
    //   path: 'guides',
    //   select: '-__v -passwordChangedAt', //don't display __v and passwordChangedAt
    // });

    // however, if we want to populate the virtual reviews field we can do the one below:
    // const doc = await Model.findById(req.params.id).populate('reviews');

    //And now, since we are now in the factory, we will have to modify how we compose our query to
    //include the populate. This is the final look of our findById
    let query = Model.findById(req.params.id);
    //in the above line, we don't want to await right away to manipulate query in the next step
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;

    //if doc is null, then we throw an error to next
    //return quickly to avoid sending 2 nexts
    if (!doc) {
      return next(new AppError('No document with specified ID', 404));
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: { data: doc },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To Allow for nested GET reviews on tour
    // if there's a tour Id then, we will have tourFilter object inside our find() below
    // now filtering all of the reviews for a specific tour that matches the tour id.
    // Else, we will pass an empty tourFilter querying all of the reviews.
    let tourFilter = {};
    if (req.params.tourId) tourFilter = { tour: req.params.tourId };

    // EXECUTE QUERY
    // we now create a a more generic class in APIFeatures
    // and pass in a query object coming from find and the req.query
    const features = new APIFeatures(Model.find(tourFilter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // const doc = await features.queryObj.explain(); we used this when testing our indexes
    const doc = await features.queryObj; //.explain();

    // SEND RESPONSE
    res.status(200).json({
      status: 'SUCCESS',
      results: doc.length,
      data: { data: doc },
    });
  });
