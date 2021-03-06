const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cookieParser = require('cookie-parser');
const validator = require('express-validator');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const flash = require('connect-flash');
const dependencies = require('./dependencies');
const passport = require('passport');
const favicon = require('serve-favicon');
const path = require('path');
const config = require('./config/config');

function configureExpress(app){
    app.use(express.static('client/public'));
    app.use(cookieParser());
    app.set('views', __dirname + '/client/public');
    app.use(favicon(path.join(__dirname, '/client/src/img', 'icon.png')));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(validator());
    app.use(session({
        secret: config.mongo_settings.secret,
        resave: true,
        saveInitializes: true,
        saveUninitialized: true,
        store: new MongoStore({mongooseConnection: mongoose.connection}),
    }));
    app.use(flash());
    require('./config/passport-spotify')(passport);
    app.use(passport.initialize());
    app.use(passport.session());
}

dependencies.resolve(function(routing, posts){
    function SetupExpress(){
        // Setup Router/Routing
        const router = require('express-promise-router')();
        const app = express();
        const server = http.createServer(app);

        server.listen(config.port, function(){
            console.log("Server active");
        });

        configureExpress(app);
        routing.setRouting(router);
        posts.setRouting(router);
        app.use(router);
    }

    SetupExpress();

    mongoose.Promise = global.Promise;
    mongoose.connect(`mongodb://localhost:${config.mongo_settings.port}/${config.mongo_settings.name}`);
});