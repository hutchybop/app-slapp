if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}


// External Imports
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
const compression = require('compression')
const favicon = require('serve-favicon')

// Required for passport
const passport = require('passport');
const LocalStragtegy = require('passport-local');

// Required for recaptcha
var Recaptcha = require('express-recaptcha').RecaptchaV2
var recaptcha = new Recaptcha(process.env.SITEKEY, process.env.SECRETKEY, {callback: 'cb'})

// Local imports
const policy = require('./controllers/policy');
const users = require('./controllers/users');
const meals = require('./controllers/meals');
const ingredients = require('./controllers/ingredients');
const shoppingLists = require('./controllers/shoppingLists');
const categories = require('./controllers/categories');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');
const User = require('./models/user');
const {
    validateTandC, validateLogin, validateRegister, validateForgot, validateReset, validateDetails, validateDelete, 
    validateMeal, validateIngredient, validatedefault, validateshoppingListMeals, validateshoppingListIngredients, validateCategory, isLoggedIn, 
    isAuthorMeal, isAuthorIngredient, isAuthorShoppingList,
} = require('./utils/middleware');


// Setting up express
const app = express();


// Setting up mongoose
const dbName = "slapp"
let dbUrl
if (process.env.NODE_ENV !== "production") {
    dbUrl = "mongodb://127.0.0.1:27017/" + dbName; // For local db (will not work in production)
}else{
    dbUrl = "mongodb+srv://hutch:" + process.env.MONGODB + "@hutchybop.kpiymrr.mongodb.net/" + dbName + "?retryWrites=true&w=majority&appName=hutchyBop" // For Atlas (Cloud db)
}
mongoose.connect(dbUrl);
// Error Handling for the db connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


// Serve favicon from public/favicon directory
app.use(favicon(path.join(__dirname, 'public', 'favicon', 'favicon.ico')));
// Handle favicon requests explicitly
app.use('/favicon.ico', (req, res) => {
    res.sendStatus(204); // No Content
});


// Setting up the app
app.engine('ejs', ejsMate); // Tells express to use ejsmate for rendering .ejs html files
app.set('view engine', 'ejs'); // Sets ejs as the default engine
app.set('views', path.join(__dirname, 'views')); // Forces express to look at views directory for .ejs files
app.use(express.urlencoded({ extended: true })); // Makes req.body available
app.use(express.json()); // Middleware to parse JSON bodies
app.use(methodOverride('_method')); // Allows us to add HTTP verbs other than post
app.use(express.static(path.join(__dirname, '/public'))) // Serves static files (css, js, imgaes) from public directory
app.use(mongoSanitize()) // Helps to stop mongo injection by not allowing certain characters in the query string


// Logs all routes requested
app.use(logger)


// Setting up helmet to allow certain scripts/stylesheets
const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
    "https://code.jquery.com/",
    "https://www.google.com/recaptcha/api.js",
    "https://www.gstatic.com/recaptcha/releases/",
    "https://use.fontawesome.com/"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net/",
    "https://cdnjs.cloudflare.com/",
    "https://fonts.gstatic.com",
    "https://www.gstatic.com/recaptcha/releases/"
];
const imgSrcUrls = [
    "https://www.gstatic.com/recaptcha/",
    "https://www.google.com/recaptcha/"
];
const connectSrcUrls = [
    "https://www.google.com/",
    "https://www.gstatic.com/recaptcha/"
];
const fontSrcUrls = [
    "https://cdnjs.cloudflare.com/",
    "https://fonts.gstatic.com",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/"
];
const frameSrcUrls = [
    'https://www.google.com',
    'https://www.recaptcha.net'
];
// Function to configure helmet based on environment
function configureHelmet() {
    if (process.env.NODE_ENV === 'production') {
        app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        connectSrc: ["'self'", ...connectSrcUrls],
                        scriptSrc: ["'self'", "'unsafe-inline'", ...scriptSrcUrls],
                        styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
                        workerSrc: ["'self'", "blob:"],
                        objectSrc: ["'none'"],
                        imgSrc: ["'self'", "blob:", "data:", ...imgSrcUrls],
                        fontSrc: ["'self'", ...fontSrcUrls],
                        frameSrc: ["'self'", ...frameSrcUrls],
                        upgradeInsecureRequests: null,  // Relax or adjust as necessary
                        scriptSrcAttr: ["'self'", "'unsafe-inline'"]  // Adjust based on your needs
                    },
                },
                crossOriginOpenerPolicy: { policy: "same-origin" },
                originAgentCluster: true
            })
        );
    } else {
        app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'", "*"],
                        connectSrc: ["'self'", "*", ...connectSrcUrls],
                        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*", ...scriptSrcUrls],
                        styleSrc: ["'self'", "'unsafe-inline'", "*", ...styleSrcUrls],
                        workerSrc: ["'self'", "blob:"],
                        objectSrc: ["'self'", "*"],
                        imgSrc: ["'self'", "blob:", "data:", "*", ...imgSrcUrls],
                        fontSrc: ["'self'", "*", ...fontSrcUrls],
                        frameSrc: ["'self'", "*", ...frameSrcUrls],
                        upgradeInsecureRequests: null,
                        scriptSrcAttr: ["'self'", "'unsafe-inline'", "*"]
                    },
                },
                crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Relaxed for development
                originAgentCluster: false, // Disabled in development
                referrerPolicy: { policy: "no-referrer-when-downgrade" }, // Less strict referrer policy
                frameguard: false, // Disable clickjacking protection in development
                hsts: false, // Disable HTTP Strict Transport Security (HSTS) in development
                noSniff: false // Allow MIME type sniffing in development
            })
        );
    }
}
// Apply helmet configuration
configureHelmet();


//Setting up the session
const sessionConfig = {
    name: 'slapp', // Name for the session cookie
    secret: process.env.SESSION_KEY, // Secures the session
    resave: false, // Do not save session if unmodified
    saveUninitialized: false, // Do not create session until something stored
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7 * 2, // 14 days
        httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
        SameSite: 'strict', // Protect against CSRF
        secure: process.env.NODE_ENV === "production", // Only send cookie over HTTPS
    },
    store: MongoStore.create({ 
        mongoUrl: dbUrl
    })
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


// Compression to make website run quicker
app.use(compression())


app.use(async(req, res, next) => {

    res.locals.currentUser = req.user;
    // Setting up flash
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');

    next();
});


// policy routes
app.get('/policy/cookie-policy', policy.cookiePolicy)
app.get('/policy/tandc', recaptcha.middleware.render, (policy.tandc));
app.post('/policy/tandc', recaptcha.middleware.verify, validateTandC, (policy.tandcPost))
app.get('/policy/logs', catchAsync(policy.logs))


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

// Start server on port 3001 using HTTP
app.listen(3001, () => {
    console.log('Server listening on PORT 3001 (http)');
});