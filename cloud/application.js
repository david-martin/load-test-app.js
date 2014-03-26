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
     process.env.DEBUG && console.log('Caching file:', filePath, 'with key:', file);
     $fh.cache({
       act: "save",
       key: file,
       value: fs.readFileSync(filePath)
     }, function(err, res) {
       if (err) {
         console.error('Error caching file:', filePath, 'err:', err.toString());
       } else {
         process.env.DEBUG && console.log('Cached file:', filePath);
       }
     });
   });
 });


// static routes
app.use('/static', express['static'](publicDir));


// wait routes
app.get('/wait/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  process.env.DEBUG && console.log('wait:', wait, 'size:', size);
  setTimeout(function() {
    fs.readFile(path.join(publicDir, size), function(err, file) {
      if (err) {
        return res.send(500, err);
      }
      return res.send(file);
    });
  }, wait);
});

// proxy routes
app.get('/proxy/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  process.env.DEBUG && console.log('proxy wait:', wait, 'size:', size);
  request('http://50.16.66.55:6969/wait/' + wait + '/' + size, function(err2, res2, body) {
    if (err2) {
      return res.send(500, err2);
    }
    return res.send(body);
  });
});


// cache routes
app.get('/cache/:size', function(req, res) {
  var size = req.params.size;
  process.env.DEBUG && console.log('cache size:', size);
  $fh.cache({
    act: "load",
    key: size
  }, function(err, data) {
    if (err) {
      console.error('Error retrieving from cache, size:', size);
      return res.send(500, err);
    } else {
      process.env.DEBUG && console.log('Retrieved from cache, size:', size, ' length:', data.length);
      return res.send(data);
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
