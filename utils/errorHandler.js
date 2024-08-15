//Error handler
module.exports.errorHandler = (err, req, res, next) => {
    const { statusCode = 500 } = err;

    // Cast error
    if (err.name === 'CastError') {
        req.flash('error', `${err.name} The information provided cannot be found!`);
        return res.redirect('/');
    }

    // Email error
    if (err.message === '"email" must be a valid email') {
        req.flash('error', 'You need to enter a valid email address.')
        return res.redirect('/');
    }

    // Generic error
    if (!err.message) err.message = 'Oh No, something went wrong.'
    
    if (process.env.NODE_ENV !== "production") {
        res.status(statusCode).send(err.message)
    }else{
        res.status(statusCode).render('policy/error', { err, title: 'Error - Something Went Wrong'})
    }
};