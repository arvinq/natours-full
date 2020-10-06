// Our entry file. This file is more to get data from user interface, then delegate actions to other modules (other js files)

/* eslint-disable */

// in here we are importing the login function that we exported from login.js
// we use { } because we exported login func via only export. This is the same idea but different method with node's Model.exports
import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

//DOM ELEMENTS
//get the ids or classnames of the elements in the web templates
const mapBox = document.getElementById('map'); // for IDs see #map in tour.pug
const loginForm = document.querySelector('.form--login');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookButton = document.getElementById('book-tour');

// DELEGATIONS

if (mapBox) {
  //now we can get any data from our html by reading elemet attributes' dataset
  //we also need to convert this into a an object via json parse since its passed in as string.
  const locations = JSON.parse(mapBox.dataset.locations);

  displayMap(locations);
}

if (loginForm) {
  //select based on class. so in here, we select the form class.
  //submit event will be fired off by the browser when the submit button on †he form is clicked.
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); //this prevent the form from loading any other pages
    //so we cannot define email and password outside because the values are not yet caught by the event.
    //only here inside will then the listener pass in email and password for us to process.
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    logout();
  });
}

// if there is a user data form, we add the listener to the submit button.
if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    //prevent the form from being submitted. because we want to do something on the name and email values
    e.preventDefault();

    //we need to programmatically re-create the multipart formData from enctype option in our account pug.
    //and so, we can do it like this to also represent other form fields and their values.
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]); //files is an array

    console.log(form);

    updateSettings(form, 'data');

    //OLD METHOD HERE
    // const name = document.getElementById('name').value;
    // const email = document.getElementById('email').value;
    // updateSettings({ name, email }, 'data');
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    //textContent is like innerHTML in updating html contents.
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    //updateSettings is an async function. SO it will return a promise. now we can AWAIT the promise in here, and async on e above. This is to wait until its finished so we can do other stuff like clearing our password fields
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    // clear the passwords after updating it successfully. reason why we await.
    document.querySelector('.btn--save-password').textContent = 'SAVE PASSWORD';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

// our API expects this: So we need to make sure the var names has the same name as the one we will process in our updateSettings.
// "passwordCurrent": "newpass2",
// "password": "newpass3",
// "passwordConfirm": "newpass3"

if (bookButton) {
  bookButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // e.target is the element which was clicked, the one that triggered the event listener to be fired
    // button.textContent
    e.target.textContent = 'Processing...';

    // in JS, anything in data attribute that has a dash ( - ) will be converted to camel case when accessed here in JS
    // const tourId = e.target.dataset.tourId; //since same name
    const { tourId } = e.target.dataset; //we use destructuring
    bookTour(tourId);
  });
}
