const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// reqs inputs
// .body : object input { key: value }
// .params.id or params.tourId :  URL or route/<value>
// .query : url strings /?key=value pairs
// .file : contains file uploads from body > form-data

// see the req.file format below the file
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

//creating a middleware in here that uses the multer object for uploading/updating one single image using the name of the field (in the form that will upload the image ) which will hold the image to upload. This middleware will put the info of the file into the req object. (req.file)
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  //if there's no file uploaded on the request,
  if (!req.file) return next();

  //since we're doing buffer now instead of saving to disk, the filename property inside req.file will not get set but since we need the filename from req.file here in resize and also in UPDATEME, what we can do is construct/redefine our filename and assign it to req.file like so:
  //user-<user id>-<timestamp>.jpeg
  const ext = req.file.mimetype.split('/')[1];
  req.file.filename = `user-${req.user.id}-${Date.now()}.${ext}`;

  //that buffer kept in memory containing the images uploaded via Multer will then be accessible to sharp like this:
  await sharp(req.file.buffer)
    .resize(500, 500) //wxh // resizing is as the name says, cropping the images to 500x500 pixels.
    .toFormat('jpeg') // convert the images always to JPEG
    .jpeg({ quality: 90 }) // defining the quality of the jpg so that it doesn't take up space
    .toFile(`public/img/users/${req.file.filename}`); //writing the file to disk. writing the entire path to the file.

  next();
});

exports.getMe = (req, res, next) => {
  //since getOne is similar to this one, we will just assign the user's id from the user obj
  //in the request to params as this is the one needed by getOne.
  req.params.id = req.user.id;
  next();
};

//create an array after our obj via ...var
const filterObj = (obj, ...allowedFields) => {
  const newObject = {}; //creating an empty object

  //Object.keys returns an array of keys in an obj
  Object.keys(obj).forEach((element) => {
    //if the allowedFields includes the element (key), then we create a property
    //inside newObject and assign the obj's value into it.
    if (allowedFields.includes(element)) newObject[element] = obj[element];
  });

  //return the filtered newObject
  return newObject;
};

/*** UPDATE PROFILE BY USER ***/
//update user's info without the password
// req.file contains the file that we upload using Body > form-data in postman
// body parser cannot handle file uploads hence we are using form-data and the best way to easily handle it is by multer.
exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // 1) Create error if user POSTed a password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400 //bad request
      )
    );
  }

  // 2) Filter out unwanted field names that are not allowed to be updated
  // we cannot use findOne and save in this case because there are some fields that are required
  // and we are not updating those, so we will get some errors. For non-sensitive data, we can use this:
  // we put filteredBody instead of straight up req.body because we only want to update some fields
  // and not everything else. so we filter what we want to update first in filterObj
  const filteredBody = filterObj(req.body, 'name', 'email');

  //if there's a file uploaded, we then create an attribute in our object, photo, and assign the name of the file to it. since filteredBody is an object, we can easily add an object attribute to it.
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update the user document
  // after the ID, we then need to specify the object to update, and some options if there are any
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, //new returns the new updated object not the old one
    runValidators: true, //and runValidators validates our fields.
  });

  res.status(200).json({
    status: 'SUCCESS',
    data: {
      user: updatedUser,
    },
  });
});

/*** DELETE PROFILE BY USER ***/
exports.deleteMe = catchAsync(async (req, res, next) => {
  //this is again protected so user is conveniently found in our req
  // after the ID, we then need to specify the object to update, and some options if there are any
  await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });

  //204 deletede
  res.status(204).json({
    status: 'SUCCESS',
    data: null, // we don't send any data.
  });
});

exports.createUser = (req, res) => {
  //internal server error if 500 status code is used
  res.status(500).json({
    status: 'ERROR',
    message: 'Route not implemented! Please use /signup instead',
  });
};

/*** GET ALL USERS ***/
exports.getAllUsers = factory.getAll(User);
/*
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  // SEND RESPONSE
  res.status(200).json({
    status: 'SUCCESS',
    results: users.length,
    data: { users },
  });
});
*/

/*** GET BY ADMIN ***/
exports.getUser = factory.getOne(User);

/*** UPDATE BY ADMIN ***/
//Do NOT update password with this!
exports.updateUser = factory.updateOne(User);

/*** DELETE BY ADMIN ***/
exports.deleteUser = factory.deleteOne(User);

// sample file structure, that can be used inside multerStorage and multerFilter
// {
//   fieldname: 'photo',
//   originalname: 'leo.jpg',
//   encoding: '7bit',
//   mimetype: 'image/jpeg',
//   destination: 'public/img/users',
//   filename: 'bc4b74df423cc65a576047480213093a',
//   path: 'public/img/users/bc4b74df423cc65a576047480213093a',
//   size: 207078
// }
// OR
// {
//   fieldname: 'photo',
//   originalname: 'user-5c8a21f22f8fb814b56fa18a-1601718405429.jpeg',
//   encoding: '7bit',
//   mimetype: 'image/jpeg',
//   buffer: <Buffer ff d8 ff db 00 43 00 03 02 02 03 02 02 03 03 03 03 04 03 03 04 05 08 05 05 04 04 05 0a 07 07 06 08 0c 0a 0c 0c 0b 0a 0b 0b 0d 0e 12 10 0d 0e 11 0e 0b ... 56616 more bytes>,
//   size: 56666,
//   filename: 'user-5c8a21f22f8fb814b56fa18a-1601728365716.jpeg'
// }
