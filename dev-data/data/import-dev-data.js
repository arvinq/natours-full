const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const User = require('../../models/userModel');
const Review = require('../../models/reviewModel');
//we need to get the Tour model because we will pattern our imported data into it

dotenv.config({ path: './config.env' });

//DB Connections via Mongoose
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

//included in the connectionOptions objects are some options to deal
//with depracated warnings
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((conn) => {
    // console.log(conn.connection);
    console.log('DB Connection successful!');
  });

// READ JSON FILE
// ./ relative from where the nodeJS folder has actually started | current working directory.
// but if used in require, it is the dir where this actual file reside
// ${__dirname} the path of the javascript filename that is ran
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// IMPORT DATA INTO DATABASE
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false }); // turn off validation on passwordConfirm
    await Review.create(reviews);
    console.log('Successfully imported data!');
  } catch (err) {
    console.log(err);
  }
  process.exit(); //aggressive way of stopping the application
};

const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Successfully deleted data!');
  } catch (err) {
    console.log(err);
  }
  process.exit(); //aggressive way of stopping the application
};

// just to see the files concern when running this application plus all of the arguments
// that we include when running the app.
//console.log(process.argv);

// if we run this as node ./dev-data/data/import-dev-data.js --import
// process.argv will have a --import included in the arguments. Now we
// can use this to create a condition in running this application.

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
