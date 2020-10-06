class AppError extends Error {
  //constructor first method to be called
  constructor(message, statusCode) {
    //everytime we extend some built-in classes, we call super() to call the parent constructor
    //passing in the message because this is the only property the Error() accepts and we
    //are already setting the value of the message property for this class.
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'FAIL' : 'ERROR';
    this.isOperational = true;

    //If a new OBJ is created and this constructor is called, the function call
    //will not appear in stacktrace and not pollute it.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
