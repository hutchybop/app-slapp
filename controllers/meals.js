const { Meal, mealType } = require("../models/meal");
const { Ingredient } = require("../models/ingredient");
const { Category } = require("../models/category");
const { toUpperCase } = require("../utils/toUpperCase");

// INDEX - meals (GET)
module.exports.index = async (req, res) => {
  // Sorts the meals by mealType then by mealName A-Z
  let items = [];
  let meals = await Meal.find({ author: req.user._id }).populate("author");
  for (let i of meals) {
    if (i.mealName !== "None") {
      items.push({
        mealName: i.mealName,
        mealType: i.mealType,
        id: i.id,
        author: i.author,
      });
    }
  }
  items.sort((a, b) => a.mealName.localeCompare(b.mealName));
  items.sort((a, b) => b.mealType.localeCompare(a.mealType));

  res.render("meals/index", { items, title: "All Meals", page: "mealsIndex" });
};

// NEW - meals (GET)
module.exports.new = async (req, res) => {
  // Finds all the meals to check for duplicate meal names
  let mealNames = {};
  let meals = await Meal.find({ author: req.user._id });
  for (let n in meals) {
    let name = meals[n].mealName;
    let type = meals[n].mealType;
    mealNames[name] = type;
  }

  // Searches for all known ingredients
  let items = [];
  let ingredients = await Ingredient.find({ author: req.user._id }).populate(
    "author",
  );
  for (let i of ingredients) {
    items.push({ name: i.name, author: i.author });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));

  // Searchs for the user categories
  let catUser = await Category.find({ author: req.user.id });
  let catArray = catUser[0].catList;

  res.render("meals/new", {
    catArray,
    items,
    mealNames,
    mealType,
    title: "Create A New Meal",
    page: "mealsNewEdit",
  });
};

// CREATE - meals (POST)
module.exports.create = async (req, res) => {
  // Used to shorten code slightly
  const meal = req.body;

  // Uppercases the first letter of each word of the mael name, trimming the white space at the end
  let mealNameUpper = toUpperCase(meal.mealName);

  // Checking for duplicate meal name
  let mealCheck = await Meal.find({ author: req.user.id });
  let mealNames = {};
  for (let n in mealCheck) {
    let name = mealCheck[n].mealName;
    let type = mealCheck[n].mealType;
    mealNames[name] = type;
  }
  for (let m = 0; m < Object.keys(mealNames).length; m++) {
    if (
      meal.mealName == Object.keys(mealNames)[m] &&
      meal.mealType === Object.values(mealNames)[m]
    ) {
      req.flash(
        "error",
        `The Meal Name: '${meal.mealName}' has already been used, please try again.`,
      );
      return res.redirect("/meals/new");
    }
  }

  // Checking for duplicate ingredient names
  let userIng = await Ingredient.find({ author: req.user.id });
  let checkIng = [];
  if (meal.newIngredient) {
    if (typeof meal.newIngredient.name !== "string") {
      for (let i in meal.newIngredient.name) {
        checkIng.push(meal.newIngredient.name[i]);
      }
    } else {
      checkIng.push(meal.newIngredient.name);
    }
  }
  for (let m in userIng) {
    if (checkIng.includes(userIng[m].name)) {
      req.flash(
        "error",
        `The Ingredient: '${userIng[m].name}' has already been used, please try again.`,
      );
      return res.redirect("/meals/new");
    }
  }

  // Required arrays to add to new meal creatation
  let weekly = [];
  let replace = [];

  // Creates the ingredients using the key from the categroy value
  if (meal.newIngredient) {
    if (typeof meal.newIngredient.name == "string") {
      await Ingredient.create({
        name: meal.newIngredient.name,
        cat: meal.newIngredient.cat,
        author: req.user._id,
      });
    } else {
      for (let i = 0; i < meal.newIngredient.name.length; i++) {
        await Ingredient.create({
          name: meal.newIngredient.name[i],
          cat: meal.newIngredient.newCat[i],
          author: req.user._id,
        });
      }
    }
  }

  // Add new indgredients to week or replace arrays
  if (meal.newIngredient) {
    if (typeof meal.newIngredient.name == "string") {
      const name = await Ingredient.findOne({
        $and: [{ name: meal.newIngredient.name }, { author: req.user._id }],
      });
      if (meal.newIngredient.newAddTo === "W(n)") {
        weekly.push({
          qty: meal.newIngredient.newQty,
          weeklyIngredients: name,
        });
      } else {
        replace.push({
          qty: meal.newIngredient.newQty,
          replaceOnUseIngredients: name,
        });
      }
    } else {
      for (let i = 0; i < meal.newIngredient.name.length; i++) {
        const name = await Ingredient.findOne({
          $and: [
            { name: meal.newIngredient.name[i] },
            { author: req.user._id },
          ],
        });
        if (meal.newIngredient.newAddTo[i] === "W(n)") {
          weekly.push({
            qty: meal.newIngredient.newQty[i],
            weeklyIngredients: name,
          });
        } else {
          replace.push({
            qty: meal.newIngredient.newQty[i],
            replaceOnUseIngredients: name,
          });
        }
      }
    }
  }

  // Add indgredients to week or replace arrays
  if (meal.ingredient) {
    if (typeof meal.ingredient.name == "string") {
      const name = await Ingredient.findOne({
        $and: [{ name: meal.ingredient.name }, { author: req.user._id }],
      });
      if (meal.ingredient.addTo === "W") {
        weekly.push({ qty: meal.ingredient.qty, weeklyIngredients: name });
      } else {
        replace.push({
          qty: meal.ingredient.qty,
          replaceOnUseIngredients: name,
        });
      }
    } else {
      for (let i = 0; i < meal.ingredient.name.length; i++) {
        const name = await Ingredient.findOne({
          $and: [{ name: meal.ingredient.name[i] }, { author: req.user._id }],
        });
        if (meal.ingredient.addTo[i] === "W") {
          weekly.push({ qty: meal.ingredient.qty[i], weeklyIngredients: name });
        } else {
          replace.push({
            qty: meal.ingredient.qty[i],
            replaceOnUseIngredients: name,
          });
        }
      }
    }
  }

  // Creating the new meal
  const newMeal = new Meal({
    mealName: mealNameUpper,
    mealRecipe: meal.mealRecipe,
    weeklyItems: weekly,
    replaceOnUse: replace,
    mealType: meal.mealType,
    author: req.user._id,
  });
  await newMeal.save();

  req.flash("success", `Succesfully created '${mealNameUpper}'`);
  res.redirect(`/meals/${newMeal._id}`);
};

// SHOW - meals (GET)
module.exports.show = async (req, res) => {
  const { id } = req.params;
  const meal = await Meal.findById(id)
    .populate({ path: "weeklyItems", populate: { path: "weeklyIngredients" } })
    .populate({
      path: "replaceOnUse",
      populate: { path: "replaceOnUseIngredients" },
    })
    .populate("author");

  res.render("meals/show", { meal, title: meal.mealName, page: "mealsShow" });
};

// EDIT - meals (GET)
module.exports.edit = async (req, res) => {
  const { id } = req.params;
  try {
    // Finds all the meals to check for duplicate meal names
    let mealNames = {};
    let meals = await Meal.find({ author: req.user._id });
    for (let n in meals) {
      let name = meals[n].mealName;
      let type = meals[n].mealType;
      mealNames[name] = type;
    }

    let items = [];

    // finds all the ingredients for the user
    let ingredients = await Ingredient.find({ author: req.user._id }).populate(
      "author",
    );
    for (let i of ingredients) {
      items.push({ name: i.name, author: i.author });
    }
    items.sort((a, b) => a.name.localeCompare(b.name));

    // finds all the meal and all it's ingredients
    const meal = await Meal.findById(id)
      .populate({
        path: "weeklyItems",
        populate: { path: "weeklyIngredients" },
      })
      .populate({
        path: "replaceOnUse",
        populate: { path: "replaceOnUseIngredients" },
      })
      .populate("author");

    // Searchs for the user categories
    let catUser = await Category.find({ author: req.user.id });
    let catArray = catUser[0].catList;

    res.render("meals/edit", {
      meal,
      mealType,
      catArray,
      items,
      mealNames,
      title: `Edit ${meal.mealName}`,
      page: "mealsNewEdit",
    });
  } catch (err) {
    req.flash("error", `${err}`);
    return res.redirect(`/meals/${id}`);
  }
};

// UPDATE - meals (PUT)
module.exports.update = async (req, res) => {
  const { id } = req.params;

  // Used to shorten code slightly
  const meal = req.body;

  // Required arrays to add to new meal creatation
  let weekly = [];
  let replace = [];

  // creates the ingredients using the key from the cateroy value
  if (meal.newIngredient) {
    if (typeof meal.newIngredient.name == "string") {
      await Ingredient.create({
        name: meal.newIngredient.name,
        cat: meal.newIngredient.newCat,
        author: req.user._id,
      });
    } else {
      for (let i = 0; i < meal.newIngredient.name.length; i++) {
        await Ingredient.create({
          name: meal.newIngredient.name[i],
          cat: meal.newIngredient.newCat[i],
          author: req.user._id,
        });
      }
    }
  }

  // Add new indgredients to week or replace arrays
  if (meal.newIngredient) {
    if (typeof meal.newIngredient.name == "string") {
      const name = await Ingredient.findOne({
        $and: [{ name: meal.newIngredient.name }, { author: req.user._id }],
      });
      if (meal.newIngredient.newAddTo === "W(n)") {
        weekly.push({
          qty: meal.newIngredient.newQty,
          weeklyIngredients: name,
        });
      } else {
        replace.push({
          qty: meal.newIngredient.newQty,
          replaceOnUseIngredients: name,
        });
      }
    } else {
      for (let i = 0; i < meal.newIngredient.name.length; i++) {
        const name = await Ingredient.findOne({
          $and: [
            { name: meal.newIngredient.name[i] },
            { author: req.user._id },
          ],
        });
        if (meal.newIngredient.newAddTo[i] === "W(n)") {
          weekly.push({
            qty: meal.newIngredient.newQty[i],
            weeklyIngredients: name,
          });
        } else {
          replace.push({
            qty: meal.newIngredient.newQty[i],
            replaceOnUseIngredients: name,
          });
        }
      }
    }
  }

  // Add indgredients to week or replace arrays
  if (meal.ingredient) {
    if (typeof meal.ingredient.name == "string") {
      const name = await Ingredient.findOne({
        $and: [{ name: meal.ingredient.name }, { author: req.user._id }],
      });
      if (meal.ingredient.addTo === "W") {
        weekly.push({ qty: meal.ingredient.qty, weeklyIngredients: name });
      } else {
        replace.push({
          qty: meal.ingredient.qty,
          replaceOnUseIngredients: name,
        });
      }
    } else {
      for (let i = 0; i < meal.ingredient.name.length; i++) {
        const name = await Ingredient.findOne({
          $and: [{ name: meal.ingredient.name[i] }, { author: req.user._id }],
        });
        if (meal.ingredient.addTo[i] === "W") {
          weekly.push({ qty: meal.ingredient.qty[i], weeklyIngredients: name });
        } else {
          replace.push({
            qty: meal.ingredient.qty[i],
            replaceOnUseIngredients: name,
          });
        }
      }
    }
  }

  // Updating the new meal
  await Meal.findByIdAndUpdate(id, {
    mealName: meal.mealName,
    mealRecipe: meal.mealRecipe,
    weeklyItems: weekly,
    replaceOnUse: replace,
    mealType: meal.mealType,
  });

  req.flash("success", `Succesfully updated '${meal.mealName}'`);
  res.redirect(`/meals/${id}`);
};

// DELETE - Meals (DELETE)
module.exports.delete = async (req, res) => {
  const { id } = req.params;
  const meal = await Meal.findByIdAndDelete(id);
  req.flash("success", `Succesfully deleted '${meal.mealName}'`);
  res.redirect("/meals");
};
