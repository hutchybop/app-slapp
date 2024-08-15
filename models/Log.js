const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LogSchema = new Schema({
    ip: { type: String, required: true, unique: true },
    country: String,
    city: String,
    timesVisited: { type: Number, default: 0 },
    lastVisitDate: String,
    lastVisitTime: String,
    routes: { type: Map, of: Number }
})

const Log = mongoose.model('Log', LogSchema);
module.exports.Log = Log