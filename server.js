/***
 * Everything that is related to the server in here. This is the entrypoint.
 * Database configuration, error handling, environment variables.
 *
 * IMPORTANT:
 * Since we want to run server.js instead of the app.js,
 * we need to modify the scripts inside package.json and
 * add "start": "nodemon server.js" so that we can just
 * run npm start in our console or npm run start:<env>
 *
 * "start:dev": "nodemon server.js",
 * "start:prod": "NODE_ENV=production nodemon server.js"
 *
 * npm run start:<env>
 *
 * If nodemon is not yet installed, do:
 * npm install nodemon --global
 *
 */

const mongoose = require('mongoose');

// to read our config.env and enter all of the configs
// into nodeJS env variables (process.env), we install dotenv...
const dotenv = require('dotenv');
//...then load the config env file by creating
//an object containing the path
dotenv.config({ path: './config.env' });

const app = require('./app');

//uncaught exceptions - all the bugs that occured on SYNCHRONOUSE code
//like printing a unidentified var: console.log(x);
//crashing in here is mandatory because entire node process is in unclean state
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION. Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

//DB Connections via Mongoose
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
//included in the connectionOptions objects are some options to deal
//with depracated warnings
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((conn) => {
    // console.log(conn.connection);
    console.log('DB Connection successful!');
  });

//express sets the "env" variable.
// console.log(app.get('env'));

//nodeJS's environment variables
// console.log(process.env);

/*************************** START SERVER ******************************/
//listening to url and assign the server to a var to use for our safety net
//Heroku will assign a random port number to process.env.PORT so it is important to listen to this port across the app.
const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

//our safety net. Process always omits an unhandledRejection event object
//that we will listen to to catch unhandled promises rejections.
//since we can't connect at all, then the only thing to do is shutdown
//the application by closing all the request on the server and
// passing 1 to process.exit(1).
// while crashing the application is optional though
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION. Shutting down...');
  console.log(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});

//HEroku dynos are containers in which the app is running. It restarts every 24hrs to keep the app in a healthy state.
// and the way heroku does this is by sending a SIGTERM signal. It is a signal to cause the program to stop running
// we need to listen to this event that heroku emits every 24 hrs to refresh our app.
// we shutdown the application gracefully by using server.close to allow all the pending requests to process until the end.
process.on('SIGTERM', () => {
  console.log('👋🏻 SIGTERM RECEIVED. Shutting down gracefully.');
  //graceful shutdown. Handles all the pending request before shutdown.
  server.close(() => {
    console.log('Process Terminated');
  });
});
