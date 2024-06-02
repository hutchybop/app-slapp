if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


// required packages
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const back = require('express-back');
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet');
const https = require('node:https');
const expressip = require('express-ip');
const compression = require('compression')

// database lookup for blockedIPs
const BlockedIP = require('./models/blockedIP')
const { reviewIp } = require('./utils/ipLookup');
const tnc = require('./utils/tnc')

// required for passport
const passport = require('passport');
const LocalStragtegy = require('passport-local');

// required for recaptcha
var Recaptcha = require('express-recaptcha').RecaptchaV2
var recaptcha = new Recaptcha(process.env.SITEKEY, process.env.SECRETKEY, {callback: 'cb'})

// requires modules.exports
const info = require('./controllers/info');
const users = require('./controllers/users');
const meals = require('./controllers/meals');
const ingredients = require('./controllers/ingredients');
const shoppingLists = require('./controllers/shoppingLists');
const categories = require('./controllers/categories');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const {
    validateInfo, validateLogin, validateRegister, validateForgot, validateReset, validateDetails, validateDelete, 
    validateMeal, validateIngredient, validatedefault, validateshoppingListMeals, validateshoppingListIngredients, validateCategory, isLoggedIn, 
    isAdmin, isAuthorMeal, isAuthorIngredient, isAuthorShoppingList,
} = require('./utils/middleware');
const { errorHandler } = require('./utils/errorHandler');
const User = require('./models/user');
const { myLogger, serveHTTP } = require('./utils/trackerLog');

// setting up express
const app = express();

// Setting up SSL Certificates
const https_options = {
    key: process.env.HUTCHYBOP_KEY.replace(/\\n/g, '\n'),
    cert: process.env.CRT_CODE.replace(/\\n/g, '\n'),
    keepAlive: false
};

// setting up mongoose
const dbName = "shoppinglist"
// const dbUrl = "mongodb://127.0.0.1:27017/" + dbName; // For local db
const dbUrl = "mongodb+srv://hutch:" + process.env.MONGODB + "@hutchybop.kpiymrr.mongodb.net/" + dbName + "?retryWrites=true&w=majority&appName=hutchyBop" // For Atlas (Cloud db)
mongoose.connect(dbUrl);

// Error Handling for the db connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
// Allows us to add HTTP verbs other than post
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '/public')))

// Helps to stop mongo injection by not allowing certain characters in the query string
app.use(mongoSanitize())

// Helmet protects again basic security holes.
app.use(helmet())

// Setting up helmet to allow certain scripts/stylesheets
const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
    "https://cdn.jsdelivr.net/",
    "https://code.jquery.com/",
    "https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js",
    "https://www.google.com/",
    "https://www.google.com/recaptcha/api.js",
    "https://www.gstatic.com/",
    "https://www.gstatic.com/recaptcha/releases/vj7hFxe2iNgbe-u95xTozOXW/recaptcha__en.js"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net/",
    "https://cdnjs.cloudflare.com/",
    "https://fonts.gstatic.com",
    "https://fonts.googleapis.com/",
];
const imgSrcUrls = [
    'https://res.cloudinary.com/hutchybopslapp/'
];
const connectSrcUrls = [
    "https://www.google.com/"
];
const fontSrcUrls = [
    "https://cdnjs.cloudflare.com/",
    "https://fonts.gstatic.com",
    "https://fonts.googleapis.com/",
];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'", "https://www.google.com/"],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                ...imgSrcUrls
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


//Setting up the session
const sessionConfig = {
    name: 'hutchyBop',
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7 * 2, // 14 days
        httpOnly: true,
        SameSite: true
    },
    store: MongoStore.create({ 
        // mongoUrl: 'mongodb://127.0.0.1/shoppinglist' 
        mongoUrl: dbUrl
    })
}

// Serve secure cookies when in production mode
if (process.env.NODE_ENV === 'production') {
    sessionConfig.cookie.secure = true 
}

app.use(session(sessionConfig))

// Required after session setup.
app.use(flash());
app.use(back());

// Setting up passport. Required to be after session setup.
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStragtegy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Setting up express-ip
app.use(expressip().getIpInfoMiddleware);

// Compression to make website run quicker
app.use(compression())

app.use(async(req, res, next) => {

    res.locals.currentUser = req.user;
    // Setting up flash
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    // Setting up tracker log
    myLogger(req, res, next)
    if(String(req.secure) == process.env.REQ_SECURE){
        return res.redirect('https://' + req.headers.host + req.url)
    }

    // redirecting blockedips
    const blocked = await BlockedIP.find();
    let { ip } = reviewIp(req)
    if(blocked[0] !== undefined){
        if(blocked[0].blockedIPArray.includes(ip)){
            next(new ExpressError(
                'This IP address is blocked for violating the terms and conditions ' + '\n\n' 
                + 'If you think this is wrong, contact me at' + process.env.EMAIL_USER + '\n\n' + tnc.tnc, 403
            )) 
        }
    }

    next();
});


// info route
app.get('/info', recaptcha.middleware.render, (info.index));
app.post('/info', recaptcha.middleware.verify, validateInfo, (info.submit))
// Test Route
app.get('/test', (info.test))

// user routes
app.get('/auth/register', (users.register))
app.post('/auth/register', validateRegister, catchAsync(users.registerPost))
app.get('/auth/login', users.login)
app.post('/auth/login', validateLogin, passport.authenticate('local', { failureFlash: true, failureRedirect: '/auth/login' }), catchAsync(users.loginPost))
app.get('/auth/logout', users.logout)
app.get('/auth/forgot', users.forgot)
app.post('/auth/forgot',  validateForgot, catchAsync(users.forgotPost))
app.get('/auth/reset/:token', users.reset)
app.post('/auth/reset/:token', validateReset, catchAsync(users.resetPost))
app.get('/auth/details', isLoggedIn, users.details)
app.post('/auth/details', validateDetails, catchAsync(users.detailsPost))
app.get('/auth/deletepre', isLoggedIn, users.deletePre)
app.delete('/auth/delete', isLoggedIn, validateDelete, users.delete)

// meal routes
app.get('/meals', isLoggedIn, catchAsync(meals.index))
app.get('/meals/new', isLoggedIn, catchAsync(meals.new))
app.post('/meals', isLoggedIn, validateMeal, catchAsync(meals.create))
app.get('/meals/:id', isLoggedIn, isAuthorMeal, catchAsync(meals.show))
app.get('/meals/:id/edit', isLoggedIn, isAuthorMeal, catchAsync(meals.edit))
app.put('/meals/:id', isLoggedIn, validateMeal, isAuthorMeal, catchAsync(meals.update))
app.delete('/meals/:id', isLoggedIn, isAuthorMeal, catchAsync(meals.delete))

// ingredient routes
app.get('/ingredients', isLoggedIn, catchAsync(ingredients.index))
app.get('/ingredients/:id/edit', isLoggedIn, isAuthorIngredient, catchAsync(ingredients.edit))
app.put('/ingredients/:id', isLoggedIn, validateIngredient, isAuthorIngredient, catchAsync(ingredients.update))
app.delete('/ingredients/:id', isLoggedIn, isAuthorIngredient, catchAsync(ingredients.delete))

// shoppingList routes
app.get('/', catchAsync(shoppingLists.landing))
app.get('/shoppinglist', isLoggedIn, catchAsync(shoppingLists.index))
app.get('/shoppinglist/new', isLoggedIn, catchAsync(shoppingLists.newMeals))
app.get('/shoppinglist/default', isLoggedIn, catchAsync(shoppingLists.defaultGet))
app.patch('/shoppinglist/default', isLoggedIn, validatedefault, catchAsync(shoppingLists.defaultPatch))
app.post('/shoppinglist', isLoggedIn, validateshoppingListMeals, catchAsync(shoppingLists.createMeals))
app.get('/shoppinglist/edit/:id', isLoggedIn, isAuthorShoppingList, catchAsync(shoppingLists.edit))
app.put('/shoppinglist/:id', isLoggedIn, validateshoppingListIngredients, isAuthorShoppingList, catchAsync(shoppingLists.createIngredients))
app.get('/shoppinglist/:id', isLoggedIn, isAuthorShoppingList, catchAsync(shoppingLists.show))
app.delete('/shoppinglist/:id', isLoggedIn, isAuthorShoppingList, catchAsync(shoppingLists.delete))
app.post('/logger', isLoggedIn, isAdmin, catchAsync(shoppingLists.logger))

// category routes
app.get('/category/customise', isLoggedIn, catchAsync(categories.indexCustomise))
app.post('/category/customise', isLoggedIn, validateCategory, catchAsync(categories.updateCustomise))

// Site-Map route
app.get('/sitemap.xml', (req, res) => {
    res.sendFile('/home/hutch/slapp/public/manifest/sitemap.xml');
});


// Unknown (404) webpage error
// Uses the ExpressError to pass message (Page Not Found) and statusCode (404)
// to the error handler
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})


// Error Handler, from utils.
app.use(errorHandler)


// http.createServer(app).listen(80);
app.listen(80);

// https Server (Port 443)
https.createServer(https_options, app).listen(443, () => {
    console.log('Server listening on PORT 443 (https)');
    serveHTTP() // logging function
});