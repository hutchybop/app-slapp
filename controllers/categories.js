const { Category } = require("../models/category");
const { Ingredient } = require("../models/ingredient");
const { toUpperCase } = require("../utils/toUpperCase");

// INDEX - categoryCustomise
module.exports.indexCustomise = async (req, res) => {
  // Searchs for the user categories
  let catUser = await Category.find({ author: req.user.id });
  let catName = catUser[0].catList;

  // Used in indexCustomise.ejs to track category name order
  const catObj = {
    0: catName[0],
    1: catName[1],
    2: catName[2],
    3: catName[3],
    4: catName[4],
    5: catName[5],
    6: catName[6],
    7: catName[7],
    8: catName[8],
    9: catName[9],
    10: catName[10],
  };

  res.render("categories/indexCustomise", {
    catObj,
    js_page: "categoryCustomise",
    title: "Customise Your Categories",
  });
};

// UPDATE - categoryCustomise
module.exports.updateCustomise = async (req, res) => {
  const newCatsObj = req.body;

  for (let u in newCatsObj) {
    if (newCatsObj[u] instanceof Array) {
      req.flash(
        "error",
        "You cannot have Categories with the same name, please try again.",
      );
      return res.redirect("/category/customise");
    }
  }

  const oldCats = await Category.findOne({ author: req.user.id });
  const allIngreients = await Ingredient.find({ author: req.user.id });
  let newCats = [];

  // Adding the new Categories to newCats array
  for (let i = 0; i < oldCats.catList.length; i++) {
    let catToUpperCase = toUpperCase(Object.keys(newCatsObj)[i]);
    newCats.push(catToUpperCase);
  }

  // Updating the new Category names and order to db
  await Category.findOneAndUpdate(
    { author: req.user.id },
    { catList: newCats },
  );

  // Updating Category name changes to ingredients
  for (let i = 0; i < oldCats.catList.length; i++) {
    let newNamePos = Object.values(newCatsObj)[i];
    let newName = toUpperCase(Object.keys(newCatsObj)[i]);

    let oldName = oldCats.catList[Number(newNamePos)];

    if (oldName != newName) {
      for (let c of allIngreients) {
        if (c.cat == oldName) {
          await Ingredient.findByIdAndUpdate(c.id, { cat: newName });
        }
      }
    }
  }

  req.flash("success", "Categories updated");
  res.redirect("/ingredients");
};
