const { Category } = require("../models/category")
const { Ingredient } = require('../models/ingredient')
const { Meal } = require('../models/meal')

module.exports.newUserSeed = async (userId) => {

    const newCategory = new Category({
        catList: [
            'Toiletries',
            'Veg 1',
            'Veg 2',
            'Veg 3',
            'Veg 4',
            'Meat And dairy',
            'Beans And Spices',
            'Middle store',
            'Milk And bread',
            'Frozen',
            'Non food',
        ],
        author: userId
    })
    await newCategory.save();
    
    // 'Defualt' user ID to be seeded from
    const defaultUserId = process.env.DEFAULT_USER_ID //defaultMeals

    // Searches for all the defaultUser ingredients
    const defaultUserIngredients = await Ingredient.find({author: defaultUserId})
    // Loops each ingredient and adds it to the user's ingredients
    for(i in defaultUserIngredients){
        await Ingredient.create({ name: defaultUserIngredients[i].name, cat: defaultUserIngredients[i].cat, author: userId })
    }

    // // Searches for all the defaultUser meals
    const defaultUserMeals = await Meal.find({author: defaultUserId})        
        .populate({ path: 'weeklyItems', populate: { path: 'weeklyIngredients' } })
        .populate({ path: 'replaceOnUse', populate: { path: 'replaceOnUseIngredients' } })

    // Loops all the meals
    for(m in defaultUserMeals){

        // Need to create unique weekly items
        let weeklyItems = []
        for(i in defaultUserMeals[m].weeklyItems){
            let name = defaultUserMeals[m].weeklyItems[i].weeklyIngredients.name
            let qty = defaultUserMeals[m].weeklyItems[i].qty
            let weeklyIng = await Ingredient.findOne({
                $and: [{ name }, { author: userId }]
            })
            weeklyItems.push({
                qty, 
                weeklyIngredients: weeklyIng
            })
        }

        // Need to create unique replaceOnUse items
        let replaceOnUseItems = []
        for(i in defaultUserMeals[m].replaceOnUse){
            let name = defaultUserMeals[m].replaceOnUse[i].replaceOnUseIngredients.name
            let qty = defaultUserMeals[m].replaceOnUse[i].qty
            let replaceOnUseIng = await Ingredient.findOne({
                $and: [{ name }, { author:userId }]
            })
            replaceOnUseItems.push({
                qty, 
                replaceOnUseIngredients: replaceOnUseIng
            })
        }

        // Creating the new meal
        const newMeal = new Meal({
            default: defaultUserMeals[m].default,
            mealName: defaultUserMeals[m].mealName,
            mealRecipe: defaultUserMeals[m].mealRecipe,
            weeklyItems: weeklyItems,
            replaceOnUse: replaceOnUseItems,
            mealType: defaultUserMeals[m].mealType,
            author: userId
        })
        await newMeal.save();

    }
}