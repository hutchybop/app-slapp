const tnc = require('../utils/tnc')
const { mail } = require('../utils/mail')
const crypto = require('crypto');
const { Log } = require('../models/Log')


// GET - policy/cookie-policy
module.exports.cookiePolicy = (req, res) => {

    res.render('policy/cookiePolicy', {title: 'cookiePolicy', page: 'cookiePolicy'})

}


// GET - tandc
module.exports.tandc = (req, res) => {

    res.render('policy/tandc', { captcha: res.recaptcha, title: 'hutchybop.co.uk Information Page', page: 'tandc', tnc: tnc.tnc });
}


// POST - policy/tandc
module.exports.tandcPost = (req, res) => {

    if (!req.recaptcha.error) {

        mail(
            'Contact Form Submitted - hutchybop.co.uk',
            'Hello,\n\n' +
                'Your message to hutchybop.co.uk has been submittted. The details are below' + '\n\n' + 
                `Name: ${req.body.name}` + '\n\n' +
                `Email: ${req.body.email}` + '\n\n' +
                `Message: ${req.body.message}`,
            req.body.email
        )
    
        mail(
            'Contact Form Submitted - hutchybop.co.uk',
            'Hello,\n\n' +
                'A new message has been submitted' + '\n\n' + 
                `Name: ${req.body.name}` + '\n\n' +
                `Email: ${req.body.email}` + '\n\n' +
                `Body: ${req.body.message}`
        )

        req.flash('success', 'Message sent.');
        res.redirect('/policy/tandc')

    } else {
        req.flash('error', 'recaptcha failed, please try again');
        res.redirect('/policy/tandc')
    }

}


// GET - policy/logs
module.exports.logs = async(req, res) => {

    const apiKeyHash = req.query.key;

    if (!apiKeyHash) {
        
        // Function to generate the API key hash for the user
        function generateApiKeyHash(apiKey, secret) {
            return crypto.createHmac('sha256', secret)
                        .update(apiKey)
                        .digest('hex');
        }
        const apiKey = process.env.APIKEY; // The actual API key
        const secret = process.env.APISECRET; // The same secret used by the server
        // Generate the hash
        const apiKeyHash = generateApiKeyHash(apiKey, secret);
        // Show the hash
        return res.json({key: apiKeyHash})

        // req.flash('error', 'Sorry you cannot do that')
        // return res.redirect('/')
    }

    const apiKey = process.env.APIKEY; // The single API key stored securely
    const secret = process.env.APISECRET; // A secret key stored securely

    // Generate the hash for the valid API key
    const hash = crypto.createHmac('sha256', secret)
                       .update(apiKey)
                       .digest('hex');

    // If API key is valid, proceed with the request
    if (hash !== apiKeyHash) {
        req.flash('error', 'Sorry you cannot do that')
        return res.redirect('/')
    }

    // Fetch all Log documents
    const logs = await Log.find().lean().exec();

    // Send the logs as readable JSON
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(logs, null, 2)); // 4 spaces for indentation

}
