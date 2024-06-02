const tnc = require('../utils/tnc')
const { mail } = require('../utils/mail')


// INDEX - Info
module.exports.index = (req, res) => {

    res.render('info', { captcha: res.recaptcha, title: 'hutchybop.co.uk Information Page', page: 'generic', tnc: tnc.tnc });
}


// SUBMIT - Info
module.exports.submit = (req, res) => {

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
        res.redirect('/info')

    } else {
        req.flash('error', 'recaptcha failed, please try again');
        res.redirect('/info')
    }

}


// Test Route
module.exports.test = (req, res)  => {

    res.render('test', {title: 'h', page: 'test', tnc: tnc.tnc})
}
