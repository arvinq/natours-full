/* eslint-disable */
// console.log('Hello from the client side - Alert');

export const hideAlert = () => {
  //get the element with the alert class, which is the markup div that we created.
  const el = document.querySelector('.alert');

  // move to parent then remove the child.
  if (el) el.parentElement.removeChild(el);
};

// type is either 'success' or 'error'
export const showAlert = (type, msg) => {
  //whener we show alerts, we previous alerts first.
  hideAlert();

  //create some html markup here using div then alert modifier for our css class.
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  //now here we select the element where we want to include the html markup above.
  //inside the body but right at the beginning.
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);

  //hide the alert after 5 seconds
  window.setTimeout(hideAlert, 5000);
};
