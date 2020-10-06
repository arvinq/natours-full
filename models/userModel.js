const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  //is also the username
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
  },
  photo: {
    type: String,
    //since we can now edit the user and upload the photo, (by uploading just the filename to the DB) we are now defaulting the photo to default.jpg which is in our img folder.
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: {
      //validator that only accept what is defined in [values]
      values: ['admin', 'user', 'guide', 'lead-guide'],
    },
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: [8, 'Your password should have at least 8 characters long.'],
    select: false, //permanently hide this field to the output
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password.'], //only as required input
    validate: {
      //new obj. This validator only works on CREATE a new object or on SAVE! and not UPDATE!
      //this.password is not defined on UPDATE. mongoose does not keep current obj in mem
      validator: function (val) {
        //not an arrow func because we need to use this
        //val is the current value of this field
        return val === this.password;
      },
      message: 'Your passwords does not match.',
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true, //account's validity
    select: false, //display this to user or not
  },
});

/*** MIDDLEWARES **/
//password encryption on pre hook middleware
//this will run between getting the data and persisting it to the DB
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  // if pwd is not modified, then return to next middleware to execute
  if (!this.isModified('password')) return next();

  // else encrypt/hash the password using B-Crypt to salt the password (adding random string)
  // hash the password with cost of 12 (cost param - how much computing power will this be hashed)
  // hash used in here is async and will return a promise so we need to await
  this.password = await bcrypt.hash(this.password, 12);

  // since we only need this confirm in validation, we can now delete it and not persist in db
  this.passwordConfirm = undefined;

  next();
});

//now this function will run right before a new document is actually saved.
//we want to make this happen behind the scenes for all the save, without us having to worry at all.
//this middleware is for updating the passwordChangeAt if user has changed or forgotten his/her password
userSchema.pre('save', function (next) {
  //we only want to change the passwordChangedAt property if we changed the current password
  //or if this document is not new, because if it's new, then password is just being set and not changed.
  //so we will have the same checking if the password has been not been modified plus if the doc is new
  if (!this.isModified('password') || this.isNew) return next();

  //putting the passwordChangeAt one second in the past will ensure that the token is always created
  //after the password has been changed. And so not returning false to changesPaswordAfter method.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// pre find hook
// Query middleware to modify the find in controller. This is executed before any queryObj
// is awaited in controller. and it will match all queries with a find (findOne, findAndUpdate, ...)
// as stated in the regex below. Now in here, we want to add a query that will only find users that are active.
userSchema.pre(/^find/, function (next) {
  //this points to the current query
  //this here is now a query object
  this.find({ active: { $ne: false } });
  next();
});

/*** INSTANCE METHODS ***/
//instance methods are methods available on every instance of a collection, meaning every document has this.
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //user hashed, candidate not hashed.
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changesPasswordAfter = function (JWTTimestamp) {
  //if password has never been changed yet, user will not have this property.
  //so if this is null, we just return false.
  if (this.passwordChangedAt) {
    //parseInt converts string to int. Also need to specify base.
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    //if the time when token is issued (JWT Timestamp) is before the time when
    //the user changes his/her password, then we return true
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //this will generate a random string as token for password reset
  //we need to convert the buffer to hex string to get the random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  //reset tokens are kind of like a password already so before saving to DB,
  //we need to encrypt it to prevent hackers from creating a new password out of this token
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  //token expires in 10 mins.
  //To achieve this, we need to multiply 10 by 60 for seconds then 1000 for milliseconds
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // while the encrypted token is saved in the DB.
  // unencrypted token will be sent to the user via email
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
