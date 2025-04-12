const mongoose = require('mongoose');

// Use to shorten code later on
const Schema = mongoose.Schema;


// Defining the Ingredient Schema tha mongoose will use
const CategorySchema = new Schema({
    catList: {},
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
})


// setting the Schema
const Category = mongoose.model('Category', CategorySchema);
module.exports.Category = Category