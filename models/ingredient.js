const mongoose = require("mongoose");

// Use to shorten code later on
const Schema = mongoose.Schema;

// Defining the Ingredient Schema tha mongoose will use
const IngredientSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  cat: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

// setting the Schema
const Ingredient = mongoose.model("Ingredient", IngredientSchema);

// Exporting the required constants
module.exports.Ingredient = Ingredient;
