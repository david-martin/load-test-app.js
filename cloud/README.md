load-test-app.js
================

## Endpoints

* /static/:size (size of response 1k,4k,50k)
* /cache/:size
* /wait/:wait/:size (wait = time in ms to wait before responding)
* /requestpipe/:wait/:size (use request module to pipe response from proxy server)
* /requestbuffer/:wait/:size (use request module and buffer from proxy server)
* /hyperpipe/:wait/:size (use hyperquest module to pipe response from proxy server)
* /hyperbuffer/:wait/:size (use hyperquest module and buffer from proxy server)

## Environment Variables

* FH_PORT - default = 8001 (port to start server on)
* PROXY_HOST - default = '50.16.66.55' (location of proxy server for proxy endpoints)
* PROXY_PORT - default = '6969' (proxy server port)
* DEBUG - default = false (console.log output)
* 
