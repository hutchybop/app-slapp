const { Ingredient } = require('../models/ingredient')
const { Category } = require('../models/category')
const { Meal } = require('../models/meal')
const { toUpperCase } = require('../utils/toUpperCase')


// INDEX - Ingredients
module.exports.index = async (req, res) => {

    // Searchs for the user categories
    let catUser = await Category.find({ author: req.user.id})
    let catArray = catUser[0].catList

    // Finds all the user ingredients 
    // Sorts the ingredients by name A-Z
    let ingredients = await Ingredient.find({ author: req.user._id })
    ingredients.sort((a, b) => a.name.localeCompare(b.name));

    res.render('ingredients', { ingredients, catArray, title: 'All Ingredients', page: 'ingredientsIndex' })
}


// EDIT - Ingredient
module.exports.edit = async (req, res) => {

    const { id } = req.params
    const ingredient = await Ingredient.findById(id)

    // Searchs for the user categories
    let catUser = await Category.find({ author: req.user.id})
    let catArray = catUser[0].catList

    res.render('ingredients/edit', { ingredient, catArray, title: `Edit ${ingredient.name}`, page: 'ingredientEdit' })
}


// UPDATE - Ingredient
module.exports.update = async (req, res) => {

    const { id } = req.params
    let oldName = await Ingredient.findById(id)
    let { name, cat } = req.body

    // Uppercases the first letter of each word of the ingredient, trimming the white space at the end
    name = toUpperCase(name)

    // Makes sure the new ingredient name is not the same as any other ingredient name in the db
    const ingredients = await Ingredient.find({ author: req.user._id })
    for(i in ingredients){
        if(ingredients[i].name === name && ingredients[i].id !== id ){
            req.flash('error', `You already have an ingredient named: '${name}', nothing changed`);
            return res.redirect(`/ingredients/${id}/edit`);
        }
    }
    if(oldName.name === name && oldName.cat === cat ){
        req.flash('error', `Both values are unchanged, nothing updated`);
        return res.redirect(`/ingredients/${id}/edit`);
    }else {
        await Ingredient.findByIdAndUpdate(id, { name, cat })

        req.flash('success', `'${oldName.name}' updated`);
        return res.redirect(`/ingredients`)
    }
}


// Delete - Ingredient
module.exports.delete = async (req, res) => {
    
    const { id } = req.params

    const meals = await Meal.find({author: req.user.id}).populate({ path: 'weeklyItems', populate: { path: 'weeklyIngredients' } })
    .populate({ path: 'replaceOnUse', populate: { path: 'replaceOnUseIngredients' } })


    for(m in meals){
        for(i in meals[m].weeklyItems){
            if(meals[m].weeklyItems[i].weeklyIngredients.id === id){
                meals[m].weeklyItems.splice(i, 1)
                let newWeeklyItems = meals[m].weeklyItems
                await Meal.findByIdAndUpdate(meals[m].id, {weeklyItems: newWeeklyItems})
                
            }
        }
        for(i in meals[m].replaceOnUse){
            if(meals[m].replaceOnUse[i].replaceOnUseIngredients.id === id){
                meals[m].replaceOnUse.splice(i, 1)
                let newReplaceOnUseItems = meals[m].replaceOnUse
                await Meal.findByIdAndUpdate(meals[m].id, {replaceOnUse: newReplaceOnUseItems})
                
            }
        }
    }

    const ing = await Ingredient.findByIdAndDelete(id);

    req.flash('success', `Succesfully deleted '${ing.name}'`);
    res.redirect('/ingredients');
}