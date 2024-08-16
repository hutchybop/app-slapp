const { Log } = require('./models/Log')
const { mail } = require('./utils/mail')
const mongoose = require('mongoose');

//// TODO - process.env.MONGODB not avaliable outside tmux window where node app.js is running

emailLogger = async () => {

    try{
        //connecting to mongodb
        const dbName = 'shoppinglist'
        const dbUrl = "mongodb+srv://hutch:" + process.env.MONGODB + "@hutchybop.kpiymrr.mongodb.net/" + dbName + "?retryWrites=true&w=majority&appName=hutchyBop" // For Atlas (Cloud db)
        mongoose.connect(dbUrl);

        // Fetch all Log documents
        const logs = await Log.find().lean().exec();

        // Format data as JSON
        const reportJson = JSON.stringify(logs, null, 2)

        mail(
            'ip Logs - hutchybop.co.uk',
            reportJson
        )
    }catch(error) {
        console.log(error)
    } finally {
        // Close the connection after operation
        mongoose.connection.close();
    }
}

emailLogger()