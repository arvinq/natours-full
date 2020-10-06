// catchAsync() takes in a function as a parameter, fn, and returns another function
// that takes in 3 parameters. The function that is returned calls the function that's
//passed into catchAsync(), fn, using the 3 parameters, req res, and next.
// So the return value of catchAsync() is a function that calls fn(req, res, next).
//catchAsync doesn't know what res, req, and next represent. It just returns a function
//that takes in 3 parameters. The express route handling middleware is what passes values
//into the 3 parameters, req, res, and next, which is used by the function that catchAsync() returns.

// we simply wrap our async funcs inside our catchAsync func. CatchAsync will return an
// anonymous function that is then assigned in route/handler funcs. If a route/handler is called
// return is called assigning the anonymous function to the route/handler and in turn triggering
// the async func because fn is called inside return.
// Since fn is async, it will return a promise and for instances where there's an error,
// we can catch the error by catch(next). By doing all of this, we have now eliminated
// the use of try-catch. If you want to see try-catch implementation, see previous proj.
//key points:
// - fn is the whole async-await promise body.
// - we need to call fn inside catchAsync to simulate routes getting triggered
// - once catchAsync is called, it will return the fn to be called by express
// - next is needed to be able to pass err in global error handling middleware
// - when export function is triggered, catchAsync is called, in turn calling fn
// - .catch(next) is the same as .catch((err) => next(err))
// - we can now remove the try catch in all our route handlers
// try {
// body shifted outside because of catchAsync
// } catch (err) {
//   res.status(404).json({
//     status: 'FAIL',
//     message: err,
//   });
// }

module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
