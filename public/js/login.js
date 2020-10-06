/* eslint-disable */

//we do not save into a var, because we just want to include this in our bundle and polyfill the features.
import '@babel/polyfill';
// since we've installed axios via npm , instead of require we do it like this in frontend js.
import axios from 'axios';
import { showAlert } from './alert';

console.log('Hello from the client side - Login');

//since we implemented parcel which is a js bundler, we need to export this login
export const login = async (email, password) => {
  try {
    // Axios can trigger http requests using API methods.
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password,
      },
    });

    //check the status of the response upon triggering the login api
    if (res.data.status === 'SUCCESS') {
      showAlert('success', 'Logged in successfully');

      //after 1.5 seconds, we load the root via windows timeout.
      //in order to load another page, we say location.assign
      window.setTimeout(() => {
        location.assign('/');
      }, 500);
    }
  } catch (err) {
    //get the response.data (the json response from our api) from caught err object. (found in axios doc)
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });

    //since above is an ajax request, we cannot do this on the backend
    //hence we'll be doing it here.
    if (res.data.status === 'SUCCESS') {
      // this will force a reload from the server and not from the browser cache
      // location.reload(true);

      window.setTimeout(() => {
        location.assign('/');
      }, 500);
    }
  } catch (err) {
    showAlert('error', 'Error logging out. Please try again!');
  }
};

// we'll copy this to index.js as index.js is the entry point.
//select based on class. so in here, we select the form class.
//submit event will be fired off by the browser when the submit button on †he form is clicked.
/*
document.querySelector('.form').addEventListener('submit', (e) => {
  e.preventDefault(); //this prevent the form from loading any other pages
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  login(email, password);
});
*/
