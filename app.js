const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const redis = require('redis');
const Arena = require('bull-arena');
const Queue = require('bull');


// Create Redis Client
//let client = redis.createClient();
let client = redis.createClient(6379, "127.0.0.1",{prefix:"TITAN"});
client.on('connect', function(){
  console.log('Connected to Redis...');
});

// Set Port
const port = 3000;

// Init app
const app = express();

// View Engine\
app.engine('handlebars', exphbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');

// body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

// methodOverride
app.use(methodOverride('_method'));

// Search Page
app.get('/', function(req, res, next){
  res.render('searchusers');
});

// Search processing
app.post('/user/search', function(req, res, next){
  let id = req.body.id;

  client.hgetall(id, function(err, obj){
    if(!obj){
      res.render('searchusers', {
        error: 'User does not exist'
      });
    } else {
      obj.id = id;
      res.render('details', {
        user: obj
      });
    }
  });
});

// Add User Page
app.get('/user/add', function(req, res, next){
  res.render('adduser');
});

// Process Add User Page
app.post('/user/add', function(req, res, next){
  taskQueue.add({
  'transaction_id': req.body.id,
  'enterprise_id': req.body.enterprise_id,
  "instance_id": req.body.instance_id,
  'email': req.body.email,
  'time':req.body.time,
  'state': req.body.state}, {removeOnComplete:false, delay: req.body.time, attempts: 3});
  
  res.redirect('/dashBoard');

  // client.hmset(id, [
  //   'enterprise_id', enterprise_id,
  //   'last_name', last_name,
  //   'email', email,
  //   'phone', phone
  // ], function(err, reply){
  //   if(err){
  //     console.log(err);
  //   }
  //   console.log(reply);
  //   res.redirect('/dashBoard');
  // });
});

// Delete User
app.delete('/user/delete/:id', function(req, res, next){
  client.del(req.params.id);
  res.redirect('/');
});

app.listen(port, function(){
  console.log('Server started on port '+port);
});



const arenaConfig = Arena({
  queues: [{
      // Name of the bull queue, this name must match up exactly with what you've defined in bull.
      name: "Tasks",
      // Hostname or queue prefix, you can put whatever you want.
      hostId: "Future Dated jobs",
      // Redis auth.
      redis: {
        port: "6379",
        host: "127.0.0.1"
      },
    },
  ],
},
{
  // Make the arena dashboard become available at {my-site.com}/arena.
  basePath: '/dashBoard',

  // Let express handle the listening.
  disableListen: true
});

app.use('/', arenaConfig);


var taskQueue = new Queue('Tasks', {redis: {port: 6379, host: '127.0.0.1'}});
taskQueue.process(function (job, done) {
  //console.log(job);
  console.log(job.data)
  console.log(job.attemptsMade)
  if (job.attemptsMade >= 4) {
    job.moveToCompleted();
  } else if (job.data.state = 'failed') {
  job.progress(19);
  job.moveToFailed();
  }
  done();
});

taskQueue.on('completed', job => {
  console.log(`Job with id ${job.id} has been completed`);
})
taskQueue.on('exit', function(worker, code, signal) {
  console.log('worker ' + worker.process.pid + ' died');
});


    // taskQueue.add({from: 'someone@email.com'}, {removeOnComplete:true, repeat: {
    //   every: 10000,
    //   limit: 10
    // }});