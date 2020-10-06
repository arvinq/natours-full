const nodemailer = require('nodemailer');
const htmlToText = require('html-to-text');
const pug = require('pug');

//the class is gonna be exported from this file.
//constructure is a function running when a new object is created through this class.
// new Email(user, url).sendWelcome()
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Arvin Q <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //create transporter for sendgrid
      //we don't need to specify sendGrid's server and port because nodeMailer already knows this,
      //we just need to specify it as a service.
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    // transporter is a service that actually sends the email to your chosen email service
    // we always need to create a transporter no matter what email service we use.
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST, //services: 'Gmail', 'MailTrap for dev'
      port: process.env.EMAIL_PORT,
      auth: {
        //for authentication
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      // Activate in gmail "less secure app" option
    });
  }

  //method that will do the actual sending of email.
  async send(template, subject) {
    // 1) Render the HTML for the email based on a pug template
    // we always just use pug to create the template and pass the template's name inside the render function of the response.
    //render function creates the html based on the pug template and send it to the client.
    // - res.render('');
    //BUT what we just want to do here is to create html out of the template so that we can send that html as the email
    //dirname is the location of the current running script (should be same as this email.js so utils folder).
    //we can also pass data into renderFile, this is important if we want to personalize our email.
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define the email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject, //subject: subject,
      html, // html: html,
      text: htmlToText.fromString(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  // these methods will be defined on the current object
  async sendWelcome() {
    //await here because send is an async func. we await in here so that this function only returns as soon as the email is actually sent.
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    //await here because send is an async func. we await in here so that this function only returns as soon as the email is actually sent.
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

/*
const sendEmail = async (options) => {
  // 1) Create a transporter
  // transporter is a service that actually sends the email to your chosen email service
  // we always need to create a transporter no matter what email service we use.
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, //service: 'Gmail',
    port: process.env.EMAIL_PORT,
    auth: {
      //for authentication
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Activate in gmail "less secure app" option
  });
  
  // 2) Define the email options
  const mailOptions = {
    from: 'ARVIN Q <test@abc.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };
  

// 3) Actually send the email
// sendMail returns a promise hence await
await transporter.sendMail(mailOptions); 
}; */

// module.exports = sendEmail;
