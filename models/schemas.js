const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const { mealType } = require('../models/meal')

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            method() {
                return this.$_addRule('escapeHTML');
            },
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension)

module.exports.registerSchema = Joi.object({
    username: Joi.string().required().escapeHTML(),
    email: Joi.string().email().required(),
    password: Joi.string().required().escapeHTML(),
    tnc: Joi.string().valid('checked').optional()
}).required()

module.exports.loginSchema = Joi.object({
    username: Joi.string().required().escapeHTML(),
    password: Joi.string().required().escapeHTML(),
    email: Joi.string().email()
}).required()

module.exports.forgotSchema = Joi.object({
    email: Joi.string().email().required()
}).required()

module.exports.detailsSchema = Joi.object({
    username: Joi.string().required().escapeHTML(),
    password: Joi.string().required().escapeHTML(),
    email: Joi.string().email().required()
}).required()

module.exports.deleteSchema = Joi.object({
    password: Joi.string().required().escapeHTML()
}).required()

module.exports.resetSchema = Joi.object({
    password: Joi.string().required().escapeHTML(),
    confirm: Joi.string().required().escapeHTML()
}).required()


module.exports.ingredientSchema = Joi.object({
    name: Joi.string().required().escapeHTML(),
    cat: Joi.string().escapeHTML().required()
}).required()


// This Schema matches the req.body produced from new and edit meal routes
module.exports.mealSchema = Joi.object({
    mealName: Joi.string().required().escapeHTML(),
    mealType: Joi.string().valid(...mealType).required(),
    mealRecipe: Joi.string().allow('').optional().escapeHTML(),
    ingredient: Joi.object({
        name: Joi.alternatives().try(Joi.array().unique().items(Joi.string().required().escapeHTML()), Joi.string().required().escapeHTML()),
        qty: Joi.alternatives().try(Joi.array().items(Joi.number().required().min(0)), Joi.number().required().min(0)),
        addTo: Joi.alternatives().try(Joi.array().items(Joi.string().valid('W', 'R').required()), Joi.string().valid('W', 'R').required())
    }),
    newIngredient: Joi.object({
        name: Joi.alternatives().try(Joi.array().unique().items(Joi.string().required().escapeHTML()), Joi.string().required().escapeHTML()),
        newQty: Joi.alternatives().try(Joi.array().items(Joi.number().required().min(0)), Joi.number().required().min(0)),
        newCat: Joi.alternatives().try(Joi.array().items(Joi.string().escapeHTML().required()), Joi.string().escapeHTML().required()),
        newAddTo: Joi.alternatives().try(Joi.array().items(Joi.string().valid('W(n)', 'R(n)').required()), Joi.string().valid('W(n)', 'R(n)').required())
    }),
}).or("ingredient", "newIngredient").required();


module.exports.defaultSchema = Joi.object({
    friday: Joi.string().required().escapeHTML(),
    saturday: Joi.string().required().escapeHTML(),
    sunday: Joi.string().required().escapeHTML(),
    monday: Joi.string().required().escapeHTML(),
    tuesday: Joi.string().required().escapeHTML(),
    wednesday: Joi.string().required().escapeHTML(),
    thursday: Joi.string().required().escapeHTML(),
    lunchWeekday: Joi.string().required().escapeHTML(),
    lunchWeekend: Joi.string().required().escapeHTML(),
    breakfast: Joi.string().required().escapeHTML(),
}).required()


module.exports.shoppingListMealsSchema = Joi.object({
    name: Joi.string().required().escapeHTML(),
    friday: Joi.string().required().escapeHTML(),
    saturday: Joi.string().required().escapeHTML(),
    sunday: Joi.string().required().escapeHTML(),
    monday: Joi.string().required().escapeHTML(),
    tuesday: Joi.string().required().escapeHTML(),
    wednesday: Joi.string().required().escapeHTML(),
    thursday: Joi.string().required().escapeHTML(),
    lunchWeekday: Joi.string().required().escapeHTML(),
    lunchWeekend: Joi.string().required().escapeHTML(),
    breakfast: Joi.string().required().escapeHTML(),
}).required()


module.exports.shoppingListIngredientsSchema = Joi.object({
    list: Joi.object({
        ingredient: Joi.alternatives().try(Joi.array().items(Joi.string().required().escapeHTML()), Joi.string().required().escapeHTML()),
        qty: Joi.alternatives().try(Joi.array().items(Joi.number().required().min(0)), Joi.number().required().min(0)),
        cat: Joi.alternatives().try(Joi.array().items(Joi.string().escapeHTML().required()), Joi.string().escapeHTML().required())
    }),
    extra: Joi.object({
        ingredient: Joi.alternatives().try(Joi.array().items(Joi.string().required().escapeHTML()), Joi.string().required().escapeHTML()),
        qty: Joi.alternatives().try(Joi.array().items(Joi.number().required().min(0)), Joi.number().required().min(0)),
        cat: Joi.alternatives().try(Joi.array().items(Joi.string().escapeHTML().required()), Joi.string().escapeHTML().required())
    }),
    nonFood: Joi.object({
        ingredient: Joi.alternatives().try(Joi.array().items(Joi.string().required().escapeHTML()), Joi.string().required().escapeHTML()),
        qty: Joi.alternatives().try(Joi.array().items(Joi.number().required().min(0)), Joi.number().required().min(0)),
        cat: Joi.alternatives().try(Joi.array().items(Joi.string().escapeHTML().required()), Joi.string().escapeHTML().required())
    }),
    removed: Joi.object({
        ingredient: Joi.alternatives().try(Joi.array().items(Joi.string().required().escapeHTML()), Joi.string().required().escapeHTML()),
        qty: Joi.alternatives().try(Joi.array().items(Joi.number().required().min(0)), Joi.number().required().min(0)),
        cat: Joi.alternatives().try(Joi.array().items(Joi.string().escapeHTML().required()), Joi.string().escapeHTML().required())
    })

});


module.exports.categorySchema = Joi.object().pattern(
    Joi.string().escapeHTML().required(), Joi.alternatives().try(Joi.array().items(Joi.string().escapeHTML().required()), Joi.string().escapeHTML().required())
)

module.exports.tandcSchema = Joi.object({
    name: Joi.string().required().escapeHTML(),
    message: Joi.string().required().escapeHTML(),
    email: Joi.string().email().required(),
    'g-recaptcha-response': Joi.string().allow(null, '')
}).required()
