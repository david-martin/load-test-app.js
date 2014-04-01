var webapp = require('fh-webapp');
var express = require('express');
$fh = require('fh-api');
var mainjs = require('./main.js');
var fs = require('fs');
var path = require('path');

var request = require('request');
// bypass default http limitations on connection pool
var hyperquest = require('hyperquest');

var app = express();
app.use('/sys', webapp.sys(mainjs));
//app.use('/mbaas', webapp.mbaas);
app.use('/cloud', webapp.cloud(mainjs));

var PROXY_HOST = process.env.PROXY_HOST || '50.16.66.55';
var PROXY_PORT = process.env.PROXY_PORT || '6969';
var DEBUG = process.env.DEBUG || false;
var PORT = process.env.FH_PORT || process.env.VCAP_APP_PORT || 8001;
var DISABLE_CACHE = process.env.DISABLE_CACHE || false;

// add static file contents to cache
var publicDir = path.join(__dirname, 'public');
if (!DISABLE_CACHE) {
  fs.readdir(publicDir, function(err, files) {
     files.forEach(function(file) {
       var filePath = path.join(publicDir, file);
       DEBUG && console.log('Caching file:', filePath, 'with key:', file);
       $fh.cache({
         act: "save",
         key: file,
         value: fs.readFileSync(filePath)
       }, function(err, res) {
         if (err) {
           console.error('Error caching file:', filePath, 'err:', err.toString());
         } else {
           DEBUG && console.log('Cached file:', filePath);
         }
       });
     });
   });
}

// static routes
app.use('/static', express['static'](publicDir));


// wait routes
app.get('/wait/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  DEBUG && console.log('wait:', wait, 'size:', size);
  var start = Date.now();
  setTimeout(function() {
    DEBUG && console.log('t',Date.now() - start);
    res.set("Connection", "close"); // ab needs this
    fs.createReadStream(path.join(publicDir, size)).pipe(res);
  }, wait);
});


// proxy routes
app.get('/requestbuffer/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  DEBUG && console.log('proxy wait:', wait, 'size:', size);
  res.set("Connection", "close"); // ensure proxied response will get closed

  var start = Date.now();
  request('http://' + PROXY_HOST + ':' + PROXY_PORT + '/wait/' + wait + '/' + size, function(err2, res2, body) {
    if (err2) {
      console.error('Error in requestbuffer after ', Date.now() - start, 'ms err:', err2);
      return res.send(500, err2);
    }
    DEBUG && console.log('rb', Date.now() - start);
    return res.send(body);
  });
});

app.get('/requestpipe/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  DEBUG && console.log('proxy wait:', wait, 'size:', size);
  res.set("Connection", "close"); // ensure proxied response will get closed

  req.pipe(request('http://' + PROXY_HOST + ':' + PROXY_PORT + '/wait/' + wait + '/' + size)).pipe(res);
});

app.get('/hyperbuffer/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  DEBUG && console.log('proxy wait:', wait, 'size:', size);
  res.set("Connection", "close"); // ensure proxied response will get closed

  var start = Date.now();
  hyperquest('http://' + PROXY_HOST + ':' + PROXY_PORT + '/wait/' + wait + '/' + size, function(err2, res2) {
    if (err2) {
      console.error('Error in hyperbuffer request after ', Date.now() - start, 'ms err:', err2);
      return res.send(500, err2);
    }

    var body = '';
    res2.on('data', function(data) {
      body += data;
    });
    res2.on('error', function(err3) {
      console.error('Error in hyperbuffer response stream after ', Date.now() - start, 'ms err:', err3);
      return res.send(500, err3);
    });
    res2.on('end', function() {
      DEBUG && console.log('hb', Date.now() - start);
      return res.send(body);
    });
  });
});

app.get('/hyperpipe/:wait/:size', function(req, res) {
  var wait = req.params.wait;
  var size = req.params.size;
  DEBUG && console.log('proxy wait:', wait, 'size:', size);
  res.set("Connection", "close"); // ensure proxied response will get closed

  hyperquest('http://' + PROXY_HOST + ':' + PROXY_PORT + '/wait/' + wait + '/' + size).pipe(res);

  try {
    var req2 = hyperquest('http://' + PROXY_HOST + ':' + PROXY_PORT + '/wait/' + wait + '/' + size, function(err, res2) {
      if (err) {
        console.error(err);
        return res.send(500);
      }
    });
    req2.on('error', function(e) {
      console.error('Stream error', e);
    });
    req2.pipe(res);
  } catch(e){
    console.error('Caught hyperquest exception');
    console.error(e);
  }
});


if (!DISABLE_CACHE) {
  // cache routes
  app.get('/cache/:size', function(req, res) {
    var size = req.params.size;
    DEBUG && console.log('cache size:', size);
    $fh.cache({
      act: "load",
      key: size
    }, function(err, data) {
      if (err) {
        console.error('Error retrieving from cache, size:', size);
        return res.send(500, err);
      } else {
        DEBUG && console.log('Retrieved from cache, size:', size, ' length:', data.length);
        return res.send(data);
      }
    });
  });
}

// You can define custom URL handlers here, like this one:
app.get('/', function(req, res){
  res.end('Your Cloud App is Running');
});

module.exports = app.listen(PORT, function(){
  console.log("App started at: " + new Date() + " (internal port " + PORT + ")");
});
