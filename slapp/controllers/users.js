const User = require('../models/user');
const { Meal } = require('../models/meal');
const { Ingredient } = require('../models/ingredient');
const { ShoppingList } = require('../models/shoppingList');
const { Category } = require('../models/category');
const catchAsync = require('../utils/catchAsync');
const { mail } = require('../utils/mail')
const { newUserSeed } = require('../utils/newUserSeed')
const crypto = require('crypto')


// Register - User (GET)
module.exports.register = (req, res) => {
    res.render('users/auth/register', { title: 'Register at hutchybop.co.uk', page: 'authRegister' })
}


// Register - User (POST)
module.exports.registerPost = async (req, res) => {

    try{
        if(req.body.tnc && req.body.tnc === 'checked') {
            const { email, username, password } = req.body;
            const user = await new User({ username, email });
            const registeredUser = await User.register(user, password);
            req.logIn(registeredUser, catchAsync(async err => {
                if(err){
                    req.flash('Register Error', err);
                    return res.redirect('/auth/register');
                }
    
                // Runs newUserSeed function to copy all the meals and ingredients from the default user to the new user
                newUserSeed(req.user._id);
    
                // Send email to me to alert that a new user has signed up
                mail(
                    'New User Registered on hutchybop.co.uk',
                    'Hello,\n\n' +
                    'A new User has registered! \n\n' + 'Username: ' + username
                )
    
                req.flash('success', 'You are logged in!');
                res.redirect('/shoppinglist');
            }))
        }else{
            req.flash('error', 'You must accept the terms and conditions.')
            res.redirect('/auth/register')
        }
    }catch(err){
        req.flash('error', err.message)
        res.redirect('/auth/register')
    }
    
}


// Login - user (GET)
module.exports.login = (req, res) => {
    res.render('users/auth/login', { title: 'Login to hutchybop.co.uk', page: 'generic' });
}


// Login - user (POST)
module.exports.loginPost = async (req, res) => {

    req.flash('success', 'Welcome back!');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}


// Logout - user (GET)
module.exports.logout = (req, res) => {
    req.logout( (err) => {
        if(err){
            req.flash('Logout Error: ' + err)
        }
    });
    req.flash('success', 'Successfully logged out')
    res.redirect('/');
}


// Forgot - user (GET)
module.exports.forgot = (req, res) => {
    
    res.render('users/auth/forgot', {title: 'Password Reset', page: 'generic'})
}


// Forgot - user (POST)
module.exports.forgotPost = async (req, res) => {

    try {

        let buf = await crypto.randomBytes(20)
        let token = buf.toString('hex')

        const foundUser = await User.findOne({email: req.body.email})
        if(!foundUser) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/auth/forgot');
        }

        foundUser.resetPasswordToken = token;
        foundUser.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await foundUser.save()

        mail(
            'www.hutchybop.co.uk Password Reset',
            'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://' + req.headers.host + '/auth/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n',
            foundUser.email
        )

        req.flash('success', 'An e-mail has been sent to ' + foundUser.email + ' with further instructions.');
        res.redirect('/auth/login')

    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/auth/forgot')
    }
}


// Reset - user (GET)
module.exports.reset = async (req, res) => {
    const foundUser = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
    if (!foundUser) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/auth/forgot');
    }
    
    res.render('users/auth/reset', {token: req.params.token, title: 'Reset Your Password', page: 'generic'});
}


// Reset - user (POST)
module.exports.resetPost = async (req, res) => {
    
    try {
        const foundUser = await User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } });
        if (!foundUser) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot');
        }
        if(req.body.password === req.body.confirm) {
            await foundUser.setPassword(req.body.password)
            foundUser.resetPasswordToken = undefined;
            foundUser.resetPasswordExpires = undefined;
            await foundUser.save()
            req.login(foundUser, catchAsync(async err => {if (err) return next(err);}))
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('');
        }

        mail(
            'Your password has been changed for www.hutchybop.co.uk',
            'Hello,\n\n' +
              'This is a confirmation that the password for your account ' + foundUser.email + ' on www.hutchybop.co.uk has just been changed.\n',
            foundUser.email
        )

        req.flash('success', 'Success! Your password has been changed.');
        res.redirect('/')

    } catch (e){
        req.flash('error', e.message);
        res.redirect('/auth/login')
    }
}


// Change user details (GET)
module.exports.details = (req, res) => {
    
    const username = req.user.username
    const email = req.user.email
    
    res.render('users/auth/details', {username, email, title: 'Reset Your Email Adrress', page: 'generic'});
}


// Change user details (POST)
module.exports.detailsPost = async (req, res) => {
    try{
        const {email, username} = req.body
        const id = req.user._id
    
        const foundEmail = await User.findOne({email: req.body.email})
        const foundUsername = await User.findOne({username: req.body.username})
    
        if(foundEmail != null){
            if(foundEmail.id != id){
                req.flash('error', 'Email already registered');
                return res.redirect('/auth/details')
            }
        }
        
        if(foundUsername != null){
            if(foundUsername.id != id){
                req.flash('error', 'Username already taken');
                return res.redirect('/auth/details')
            } 
        }

        // checks if the password for the current user is correct
        const auth = await req.user.authenticate(req.body.password)

        if(auth.user !== false){
            const updatedUser = await User.findByIdAndUpdate(id, 
                {$set : {
                    username: username,
                    email: email
                    }
                }
            )
    
            const detailsUser = await User.findById(id)
    
            mail(
                'Details Updated - hutchybop.co.uk',
                'Hello,\n\n' +
                    'Your details on hutchybop.co.uk have been changed, your new details are:' + '\n\n' + 
                    `Email: ${detailsUser.email}` + '\n\n' +
                    `Username: ${detailsUser.username}` + '\n\n' +
                    'If you did not make these changes please conact' + process.env.EMAIL_USER,
                    detailsUser.email
              )
            
            if(detailsUser.email != updatedUser.email){
                mail(
                    'Details Updated - hutchybop.co.uk',
                    'Hello,\n\n' +
                        'Your details on hutchybop.co.uk have been changed, your new details are:' + '\n\n' + 
                        `Email: ${detailsUser.email}` + '\n\n' +
                        `Username: ${detailsUser.username}` + '\n\n' +
                        'If you did not make these changes please conact' + process.env.EMAIL_USER,
                        updatedUser.email
                  )
            }
    
            // 307 allows re-direct to post route so the user is re-logged in with new details
            req.flash('success', 'Details updated, please log-in with new details. An email has been sent to confirm your new details');
            res.redirect(307, '/auth/login')
        }else{
            req.flash('error', 'Password incorrect, no details changed. Please try again')
            res.redirect('/auth/details')
        }
    }catch{
        req.flash('error', e.message);
        res.redirect('/auth/login')
    }
}

// Delete account (GET)
module.exports.deletePre = (req, res) => {

    if(req.user.username != "defaultMeals" && req.user.username != "anonymous"){

        user = req.user

        res.render('users/auth/deletepre', {user, title: 'Confirm DELETE account', page: 'generic'});

    }else{
        req.flash('error', req.user.username + ' cannot be deleted here')
        res.redirect('/')
    }
}

// Delete account (POST)
module.exports.delete = async (req, res) => {

     // Checks if the password for the current user is correct
     const auth = await req.user.authenticate(req.body.password)

     if(req.user.username != "defaultMeals" && req.user.username != "anonymous"){
        if(auth.user !== false){
            await Ingredient.deleteMany({"author" : req.user._id});
            await Category.deleteMany({"author" : req.user._id})
            await Meal.deleteMany({"author" : req.user._id});
            await ShoppingList.deleteMany({"author" : req.user._id});
            await User.findByIdAndDelete(req.user._id);
    
            req.flash('success', `Succesfully deleted Account for '${req.user.email}'`)
        
            mail(
                'Account deleted on hutchybop.co.uk',
                'Hello,\n\n' +
                  'This is confirm that your account has been deleted',
                req.user.email
            )
            res.redirect('/')
         }else{
             req.flash('error', 'Incorrect password, please try again')
             res.redirect('/auth/deletepre')
         }  
     }else{
        req.flash('error', req.user.username + ' cannot be deleted here')
        res.redirect('/auth/deletepre')
     }
     
}