/* eslint-disable */

//es6 module syntax
import axios from 'axios';
import { showAlert } from './alert';
// we are using a public key here as oppose to using secret key in our bookingController
const stripe = Stripe(
  'pk_test_51HYkGzJLCcIJJAyiuSrz2iNCw14j8ArfxG7hl34lN5OvsQwucsKYswVYyLkHdMHikslUvRFAYFnZYHImMek8LyDx00GaWs6qw2'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get the checkout session from the server / API
    //since we only need a GET, we can do something like this in axios
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    // console.log(session);

    // 2) Use stripe to create checkout form + charge credit card for us
    await stripe.redirectToCheckout({
      //remember that axios created a data and put the actual session in there. hence we access data.
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('Error', err);
  }
};
