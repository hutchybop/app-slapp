const {
  tandcSchema,
  loginSchema,
  registerSchema,
  forgotSchema,
  resetSchema,
  detailsSchema,
  deleteSchema,
  mealSchema,
  ingredientSchema,
  defaultSchema,
  shoppingListMealsSchema,
  categorySchema,
  shoppingListIngredientsSchema,
} = require("../models/schemas.js");
const User = require("../models/user");
const { Meal } = require("../models/meal");
const { Ingredient } = require("../models/ingredient");
const { ShoppingList } = require("../models/shoppingList");
const catchAsync = require("./catchAsync");

// Function to send a Flash error instead of re-directing to error page
const JoiFlashError = (error, req, res, next, url) => {
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    console.log("validation error message:", msg);
    if (process.env.NODE_ENV !== "production") {
      // Allows for generic message in production
      req.flash("error", `${msg}`);
    } else if (msg.includes("must not include HTML!")) {
      req.flash("error", "No HTML allowed, this includes, &, <, > ...");
    } else {
      req.flash(
        "error",
        "There has been a validation error, please try again.",
      );
    }
    // throw new ExpressError(msg, 400)
    // ExpressError will send the user to the error page
    return res.redirect(`${url}`);
  } else {
    return next();
  }
};

// Uses Joi to validate user input for registration
module.exports.validateRegister = (req, res, next) => {
  // registerSchema is coming from the schemas.js file
  const { error } = registerSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/auth/register");
};

// Uses Joi to validate user input for logging in
module.exports.validateLogin = (req, res, next) => {
  // loginSchema is coming from the schemas.js file
  const { error } = loginSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/auth/login");
};

// Uses Joi to validate user input for forgot password form
module.exports.validateForgot = (req, res, next) => {
  // forgotSchema is coming from the schemas.js file
  const { error } = forgotSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/auth/forgot");
};

// Uses Joi to validate user input for reset password form
module.exports.validateReset = (req, res, next) => {
  // resetSchema is coming from the schemas.js file
  const { error } = resetSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/auth/forgot");
};

// Uses Joi to validate user input for changing details
module.exports.validateDetails = (req, res, next) => {
  // detailsSchema is coming from the schemas.js file
  const { error } = detailsSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/auth/details");
};

// Uses Joi to validate user input for changing details
// deleteSchema is coming from the schemas.js file
module.exports.validateDelete = (req, res, next) => {
  // deleteSchema is coming from the schemas.js file
  const { error } = deleteSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/auth/details");
};

// Uses Joi to validate user input for creating/editing a meal
module.exports.validateMeal = catchAsync(async (req, res, next) => {
  // mealSchema is coming from the schemas.js file
  const { error } = mealSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/meals");
});

// Uses Joi to validate user input for editing an ingredient
module.exports.validateIngredient = catchAsync(async (req, res, next) => {
  // ingredientSchema is coming from the schemas.js file
  const { error } = ingredientSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/ingredients");
});

// Uses Joi to validate user input for editing an ingredient
module.exports.validatedefault = catchAsync(async (req, res, next) => {
  // defaultSchema is coming from the schemas.js file
  const { error } = defaultSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/shoppinglist/default");
});

// Uses Joi to validate user input for editing an ingredient
module.exports.validateshoppingListMeals = catchAsync(
  async (req, res, next) => {
    // shoppingListS1Schema is coming from the schemas.js file
    const { error } = shoppingListMealsSchema.validate(req.body);
    // JoiFlashError function is defined above
    JoiFlashError(error, req, res, next, "/shoppinglist");
  },
);

// Uses Joi to validate user input for editing an shoppinglist
module.exports.validateshoppingListIngredients = catchAsync(
  async (req, res, next) => {
    // shoppingListIngredientSchema is coming from the schemas.js file
    const { error } = shoppingListIngredientsSchema.validate(req.body);
    // JoiFlashError function is defined above
    JoiFlashError(error, req, res, next, "/shoppinglist");
  },
);

// Uses Joi to validate user input for updating category name and order
module.exports.validateCategory = catchAsync(async (req, res, next) => {
  // categorySchema is coming from the schemas.js file
  const { error } = categorySchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/ingredients");
});

// Uses Joi to validate user input for the contact form
module.exports.validateTandC = catchAsync(async (req, res, next) => {
  // tandcSchema is coming from the schemas.js file
  const { error } = tandcSchema.validate(req.body);
  // JoiFlashError function is defined above
  JoiFlashError(error, req, res, next, "/policy/tandc");
});

module.exports.isLoggedIn = (req, res, next) => {
  if (
    !req.user ||
    !req.session.userId ||
    !req.user._id.equals(req.session.userId)
  ) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in");
    return res.redirect("/auth/login");
  }
  next();
};

module.exports.isAuthorMeal = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const meal = await Meal.findById(id)
    .populate({ path: "weeklyItems", populate: { path: "weeklyIngredients" } })
    .populate({
      path: "replaceOnUse",
      populate: { path: "replaceOnUseIngredients" },
    })
    .populate("author");
  if (!meal) {
    req.flash("error", "Cannot find that meal");
    return res.redirect("/meals");
  }
  if (!meal.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/meals");
  }
  next();
});

module.exports.isAuthorIngredient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const ingredient = await Ingredient.findById(id).populate("author");
  if (!ingredient) {
    req.flash("error", "Cannot find that ingredient");
    return res.redirect("/ingredients");
  }
  if (!ingredient.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/ingredients");
  }
  next();
});

module.exports.isAuthorShoppingList = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const shoppingList = await ShoppingList.findById(id).populate("author");
  if (!shoppingList) {
    req.flash("error", "Cannot find that ingredient");
    return res.redirect("/shoppinglist");
  }
  if (!shoppingList.author.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/shoppinglist");
  }
  next();
});

module.exports.populateUser = async (req, res, next) => {
  if (req.session && req.session.userId) {
    await User.findById(req.session.userId)
      .then((user) => {
        if (!user) {
          // User not found in database, clear session
          delete req.session.userId;
          req.user = null;
        } else {
          req.user = user;
        }
        next();
      })
      .catch((err) => next(err));
  } else {
    next();
  }
};

// Middleware to check if user is admin
module.exports.isAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "admin") {
    req.flash("error", "You do not have permission to do that");
    return res.redirect("/");
  }
  next();
};
