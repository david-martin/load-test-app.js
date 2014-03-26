var webapp = require('fh-webapp');
var express = require('express');
$fh = require('fh-api');
var mainjs = require('./main.js');
var fs = require('fs');
var path = require('path');
var request = require('request');

var app = express();
app.use('/sys', webapp.sys(mainjs));
//app.use('/mbaas', webapp.mbaas);
app.use('/cloud', webapp.cloud(mainjs));



// add static file contents to cache
var publicDir = path.join(__dirname, 'public');
 fs.readdir(publicDir, function(err, files) {
   files.forEach(function(file) {
     var filePath = path.join(publicDir, file);
     console.log('Caching file:', filePath, 'with key:', file);
     $fh.cache({
       act: "save",
       key: file,
       value: fs.readFileSync(filePath).toString('utf8')
     }, function(err, res) {
       if (err) {
         console.error('Error caching file:', filePath, 'err:', err.toString());
       } else {
         console.log('Cached file:', filePath);
       }
     });
   });
 });


// static routes
app.use('/static', express['static'](publicDir));


// proxy routes
// app.get('/proxy/:size', function(req, res) {
//   var size = req.params.size;
//   request('http://10.110.155.166/' + req.params.size, function(err, res) {
//
//   });
// });


// cache routes
app.get('/cache/:size', function(req, res) {
  var size = req.params.size;
  console.log('retrieving cache size:', size);
  $fh.cache({
    act: "load",
    key: size
  }, function(err, res) {
    if (err) {
      console.error('Error retrieving from cache, size:', size);
      return callback(err);
    } else {
      console.log('Retrieved from cache, size:', size, ' length:', res.length);
      return callback(null, res);
    }
  });
});

// You can define custom URL handlers here, like this one:
app.get('/', function(req, res){
  res.end('Your Cloud App is Running');
});

var port = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
module.exports = app.listen(port, function(){
  console.log("App started at: " + new Date() + " (internal port " + port + ")");
});
