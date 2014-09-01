#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var socket = require('socket.io');

var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : process.env.OPENSHIFT_MYSQL_DB_HOST,
    user     : 'adminyK3uKNm',
    password : '7sr9qc-rDhFq',
    database : 'nodejs',
    _socket: '/var/run/mysqld/mysqld.sock'
});

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html') );
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
        self.app.use(express.static(__dirname));
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };

    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
        //self.initializeSocketIO();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {

        //  Start the app on the specific interface (and port).
        var server = self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });


        // var connection = null;

        var io = socket.listen(server);
        io.sockets.on('connection', function (socket) {
            socket.emit('login-start', {value: 'logging in'});
            socket.on('login', function(data) {
                var value = data.value;
                // connection = mysql.createConnection({
                //     host     : process.env.OPENSHIFT_MYSQL_DB_HOST,
                //     user     : 'longpham91',
                //     password : '26121991',
                //     database : 'nodejs',
                //     _socket: '/var/run/mysqld/mysqld.sock'
                // });
                var stringQuery = "SELECT * FROM users WHERE username = '" + value.username + "'";
                connection.query(stringQuery, function(err, rows){
                    if(err) {
                        socket.emit('login-result', {value: err});
                    } else {
                        socket.emit('login-result', {value: rows});
                    }
                });
            });

            socket.emit('signup-start', {value: 'signing up'});
            socket.on('signup', function(data) {
                var value = data.value;
                // connection = mysql.createConnection({
                //     host     : process.env.OPENSHIFT_MYSQL_DB_HOST,
                //     user     : 'longpham91',
                //     password : '26121991',
                //     database : 'nodejs',
                //     _socket: '/var/run/mysqld/mysqld.sock'
                // });
                var stringQuery = "INSERT INTO users (username, password, name, title) VALUES ('" + value.username + "','" + value.password + "','" + value.name + "','" + value.title + "')";
                connection.query(stringQuery, function(err, rows){
                    if(err) {
                        socket.emit('signup-result', {value: err});
                    } else {
                        socket.emit('signup-result', {value: rows.insertId});
                    }
                });
            });

            if (connection) {
                socket.emit('project-start', {value: 'loading project'});
                socket.on('project', function(data) {
                    var value = data.value;
                    var stringQuery = "SELECT * FROM users u LEFT JOIN projects p ON u.user_id = p.user_id WHERE u.user_id = " + value.userid;
                    connection.query(stringQuery, function(err, rows){
                        if(err) {
                            socket.emit('projectstart-result', {value: err});
                        } else {
                            socket.emit('projectstart-result', {value: rows});
                        }
                    });
                });

                socket.on('newproj', function(data) {
                    var value = data.value;
                    var strQuery = "INSERT INTO projects (user_id, proj_title, proj_desc, video, main, hashtags) VALUES ('" + value.user_id + "','" + value.proj_title + "','" + value.proj_desc + "','" + value.video + "','" + value.main + "','" + value.hashtags + "')";
                    connection.query(strQuery, function(err, rows){
                        if(err) {
                            socket.emit('newproj-result', {value: err});
                        } else {
                            socket.emit('newproj-result', {value: rows});
                        }
                    });
                });
            }
        });
    };

};   /*  Sample Application.  */

/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

