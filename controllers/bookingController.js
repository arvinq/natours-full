//stripe require will expose a function, so we pass our secret key straight from here to get the stripe object.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// reqs inputs
// .body : object input { key: value }
// .params.id or params.tourId :  URL or route/<value>
// .query : url strings /?key=value pairs
// .file : contains file uploads from body > form-data

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour using the tourID passed from router
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  // We need a stripe package in order to create session
  const session = await stripe.checkout.sessions.create({
    //usual object of options
    // - A) Information about the session
    payment_method_types: ['card'], //card is for credit card
    //url that will get called as soon as the credit card has been successfully charged
    //we want to create a new booking whenever the success url is accessed. So we can put the data here
    //as a query string since stripe will just GET this url. The only way to pass in the values.
    //below is not really secure, since user can just access /my-tours/ (see viewRoutes.js) url without booking a tour.
    /*** alternative for webhook, uncomment for dev env
    success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,***/
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    //the page the user goes if they choose to cancel the payment
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    //this option will allow us to pass in some data about the session that we're currently creating
    client_reference_id: req.params.tourId,
    // - B) Information about the product that the user is about to purchase
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: `${tour.summary}`,
        images: [
          `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
        ],
        amount: `${tour.price * 100}`, //converted to cents hence multiplied by 100
        currency: 'usd',
        quantity: 1,
      },
    ],
    //once the purchas is successful, we will get access to the session object again, and we want to create a new booking in the DB. To create a booking in our DB, we need the user's ID, tour ID and the price.
  });

  // 3) create session as response
  res.status(200).json({
    status: 'SUCCESS',
    session,
  });
});

/***
alternative for webhook, uncomment for dev env
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  //All of this is only TEMPORARY, because this is UNSECURE, and everyone can make bookings without paying
  //destructuring from above success url in getCheckoutSession
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  //we redirect the url to root again instead of displaying the query strings.
  // `${req.protocol}://${req.get('host')}/
  res.redirect(req.originalUrl.split('?')[0]);
});
***/

const createBookingDoc = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100; //since we multiplied by 10 in line_items
  await Booking.create({ tour, user, price });
};

// Gets called when stripe calls our webhook,
exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // need to be in raw form
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    //stripe will receive this res. because stripe called the webhook url that will call this handler.
    return res.status(400).send(`Webhook error ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingDoc(event.data.object);
  }

  res.status(200).json({ received: true });
};

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
