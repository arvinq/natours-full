// ES6 module syntax for export import not js module syntax from nodejs
import axios from 'axios';
import { showAlert } from './alert';

/* OLD ONE BEFORE INTEGRATING THE PASSWORD UPDATE AS WELL.
export const updateData = async (name, email) => {
  try {
    //use axios in hitting the api endpoint. we should be using what http method is used
    //per API endpoint.
    //Data will be the body that is sent along with the request.
    const res = await axios({
      method: 'PATCH',
      url: 'http://127.0.0.1:3000/api/v1/users/updateMe',
      data: { name, email },
    });

    //check the status of the response upon triggering the login api
    //the status is the one we defined in all our status in api.
    if (res.data.status === 'SUCCESS') {
      showAlert('success', 'Your information is successfully updated.');

      //after 1.5 seconds, we load the root via windows timeout.
      //in order to load another page, we say location.assign
      window.setTimeout(() => {
        location.assign('/me');
      }, 500);
    }
  } catch (err) {
    //message property is the one we're defining in the server.
    showAlert('error', err.response.data.message);
  }
};
*/

// lets change the params received by this function to be an object named data containing all of the data that we want to update and also a string for the type which can either be a data or password
export const updateSettings = async (data, type) => {
  try {
    //use axios in hitting the api endpoint. we should be using what http method is used
    //per API endpoint.
    //Data will be the body that is sent along with the request.

    // we can remove the host:port (http://127.0.0.1:3000) and just keep the relative url in our frontend(client-side) javascript. This is because our API and our website are hosted on the same server (using the same url)
    const url =
      type === 'password'
        ? '/api/v1/users/updateMyPassword'
        : '/api/v1/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url, //url: url
      data, //data: data,
    });

    //check the status of the response upon triggering the login api
    //the status is the one we defined in all our status in api.
    if (res.data.status === 'SUCCESS') {
      showAlert('success', `${type.toUpperCase()} updated successfully.`);

      //after 1.5 seconds, we load the root via windows timeout.
      //in order to load another page, we say location.assign
      //   window.setTimeout(() => {
      //     location.assign('/me');
      //   }, 500);
    }
  } catch (err) {
    //message property is the one we're defining in the server.
    showAlert('error', err.response.data.message);
  }
};
