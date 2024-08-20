const { Meal } = require('../models/meal')
const { ShoppingList } = require('../models/shoppingList')
const { Category } = require('../models/category')
const { copyListFunc } = require('../utils/copyToClip')
const {mail} = require('../utils/mail')
const fs = require('fs');


// Landing - shoppinglist
module.exports.landing = async (req, res) => {

    if(req.user === undefined){
        res.render('shoppinglist/slapp', {title: 'Shopping List App - Create Your Weekly ShoppingList', page: 'slSlapp'})
    }else{

        const list = await ShoppingList.find({ author: req.user._id })
        // Sorts the list by last edited
        list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

        // If there are no lists, redirects to index to create one
        // else directs to show and opens last edited list
        if(list.length === 0){
            res.redirect('/shoppinglist')
        }else{
            res.redirect('/shoppinglist/' + list[0]._id)
        }
    }  
}


// Index - shoppinglist
module.exports.index = async (req, res) => {
    
    const list = await ShoppingList.find({ author: req.user._id })
    // Sorts the list by last edited
    list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    res.render('shoppinglist/index', { list, title: 'All Shopping Lists', page: 'slIndex' })

}


// New meals - shoppinglist
module.exports.newMeals = async (req, res) => {

    const meals = await Meal.find({ author: req.user._id })
    meals.sort((a, b) => a.mealName.localeCompare(b.mealName));
    res.render('shoppinglist/newMeals', { meals, title: 'Create A Shopping List', page: 'slNewMeals' })
}


// Create meals - shoppinglist
module.exports.createMeals = async (req, res) => {

    // Deletes oldest edited list if list length is above 10
    const listLength = await ShoppingList.countDocuments({ author: req.user._id })
    if(listLength > 9){
        const slist = await ShoppingList.find({ author: req.user._id })
        slist.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        let dropId = slist[slist.length -1].id
        await ShoppingList.findByIdAndDelete(dropId);
    }

    // Finds all choosen meals and adds them to meals object
    let meals = {}
    for (i in req.body) {
        if(req.body[i] === 'none'){
            let n = await Meal.findOne({ mealName: 'None' })
            meals[i] = n
        }
        if(i !== 'name' && req.body[i] !== 'none'){
            let m = await Meal.findOne({
                $and: [{ _id: req.body[i] }, { author: req.user._id }]
            })
            .populate('weeklyItems.weeklyIngredients').populate('replaceOnUse.replaceOnUseIngredients')
    
            meals[i] = m
        }
    }

    // Finds the 'constant Weekly Items' and 'Nonfood Items' meal type meals
    const others = await Meal.find({
        $and: [
            { mealType: { $in: ['Constant Weekly Items', 'Nonfood Items'] } },
            { author: req.user._id }
        ]
    })
    .populate('weeklyItems.weeklyIngredients').populate('replaceOnUse.replaceOnUseIngredients')

    // Add all the weekly items from each meal into the items object
    let list = {}
    for(i in meals){
        for(m of meals[i].weeklyItems){
            let weeklyName = m.weeklyIngredients.name
            let weeklyCat = m.weeklyIngredients.cat
            let weeklyQty = m.qty
            if(weeklyName in list){
                let newQty = list[weeklyName][0] + weeklyQty
                list[weeklyName] = [newQty, weeklyCat]
            }else{
                list[weeklyName] = [weeklyQty, weeklyCat]
            }
        }
    }
    for (i in others){
        for(m of others[i].weeklyItems){
            let weeklyName = m.weeklyIngredients.name
            let weeklyCat = m.weeklyIngredients.cat
            let weeklyQty = m.qty
            if(weeklyName in list){
                let newQty = list[weeklyName][0] + weeklyQty
                list[weeklyName] = [newQty, weeklyCat]
            }else{
                list[weeklyName] = [weeklyQty, weeklyCat]
            }
        }
    }

    // Adds all the replaceOnUse items to the extra object
    // Also adds the replaceOnUse items from the 'Nonfood Items' meal type to the nonfood object
    let extra = {}
    let nonFood = {}
    for(i in meals){
        for(m of meals[i].replaceOnUse){
            let replaceOnUseName = m.replaceOnUseIngredients.name
            let replaceOnUseCat = m.replaceOnUseIngredients.cat
            let replaceOnUseQty = m.qty
            if(replaceOnUseName in extra){
                let newQty = extra[replaceOnUseName][0] + replaceOnUseQty
                extra[replaceOnUseName] = [newQty, replaceOnUseCat]
            }else{
                extra[replaceOnUseName] = [replaceOnUseQty, replaceOnUseCat]
            }
        }
    }
    for (i in others){
        for(m of others[i].replaceOnUse){
            let replaceOnUseName = m.replaceOnUseIngredients.name
            let replaceOnUseCat = m.replaceOnUseIngredients.cat
            let replaceOnUseQty = m.qty
            if(others[i].mealType === 'Nonfood Items'){
                nonFood[replaceOnUseName] = [replaceOnUseQty, replaceOnUseCat]
            }else{
                if(replaceOnUseName in extra){
                    let newQty = extra[replaceOnUseName][0] + replaceOnUseQty
                    extra[replaceOnUseName] = [newQty, replaceOnUseCat]
                }else{
                    extra[replaceOnUseName] = [replaceOnUseQty, replaceOnUseCat]
                }
            }
        }
    }

    // Creates the editVer key to be added to the shoppinglist to enable the list to be edited
    let editVer = {list, extra, nonFood}

    const shoppingList = new ShoppingList({
        ...meals, 
        name: req.body.name, 
        editVer, 
        items: [list], 
        author: req.user._id
    })
    await shoppingList.save()
 
    req.flash('success', `Edit your shopping list items for: '${req.body.name}'`);
    res.redirect(`/shoppinglist/edit/${shoppingList.id}`)

}


// Edit - Shoppinglist
module.exports.edit = async (req, res) => {

    // Finds the user catergories and the shopping list to be edited
    const { id } = req.params
    let catUser = await Category.find({ author: req.user.id})
    let catArray = catUser[0].catList

    const shopList = await ShoppingList.findById(id)

    // Adds all the items from the editVer key of the list to the relevant objects
    // If statements only adds items to the object if present
    const shopListEditVer = shopList.editVer
    let current = {}
    let extra = {}
    let nonFood = {}
    let removed = {}
    if(shopListEditVer.list){
        current = shopListEditVer.list
    }
    if(shopListEditVer.extra){
        extra = shopListEditVer.extra
    }
    if(shopListEditVer.nonFood){
        nonFood = shopListEditVer.nonFood
    }
    if(shopListEditVer.removed){
        removed = shopListEditVer.removed
    }

    res.render('shoppinglist/editIngredients', { current, extra, nonFood, removed, catArray, id, title: `Edit ${shopList.name}`, page: 'slEditIng' })
}


// Create ingredients - shoppinglist
module.exports.createIngredients = async (req, res) => {

    const { id } = req.params
    
    try {
        // Converting the input from editIngredients req.body to be added to the shoppinglist
        const list = {}
        if(req.body.list){
            if(typeof req.body.list.ingredient !== 'string'){
                for (let i = 0; i < req.body.list.ingredient.length; i++) {
                    list[req.body.list.ingredient[i]] = [req.body.list.qty[i], req.body.list.cat[i]]
                }
            }else{
                list[req.body.list.ingredient] = [req.body.list.qty, req.body.list.cat]
            }
        }
        const extra = {}
        if(req.body.extra){
            if(typeof req.body.extra.ingredient !== 'string'){
                for (let i = 0; i < req.body.extra.ingredient.length; i++) {
                    extra[req.body.extra.ingredient[i]] = [req.body.extra.qty[i], req.body.extra.cat[i]]
                }
            }else{
                extra[req.body.extra.ingredient] = [req.body.extra.qty, req.body.extra.cat]
            }
        }
        const nonFood = {}
        if(req.body.nonFood){
            if(typeof req.body.nonFood.ingredient !== 'string'){
                for (let i = 0; i < req.body.nonFood.ingredient.length; i++) {
                    nonFood[req.body.nonFood.ingredient[i]] = [req.body.nonFood.qty[i], req.body.nonFood.cat[i]]
                }
            }else{
                nonFood[req.body.nonFood.ingredient] = [req.body.nonFood.qty, req.body.nonFood.cat]
            }
        }
        const removed = {}
        if(req.body.removed){
            if(typeof req.body.removed.ingredient !== 'string'){
                for (let i = 0; i < req.body.removed.ingredient.length; i++) {
                    removed[req.body.removed.ingredient[i]] = [req.body.removed.qty[i], req.body.removed.cat[i]]
                }
            }else{
                removed[req.body.removed.ingredient] = [req.body.removed.qty, req.body.removed.cat]
            }
        }

        // Creates the editVer key to be added to the shoppinglist to enable the list to be edited
        let editVer = {list, extra, nonFood, removed}

        let editedShoppingList = await ShoppingList.findByIdAndUpdate(id, { items: [list], editVer })

        req.flash('success', `Succesfully updated '${editedShoppingList.name}'`);
        res.redirect(`/shoppinglist/${id}`)

    } catch (err) {
        req.flash('error', `${err.name}: Did you add any shopping list items?`);
        return res.redirect(`/shoppinglist/edit/${id}`);
    }

}


// Show - Shoppinglist
module.exports.show = async (req, res) => {

    const { id } = req.params

    const shoppingListFinal = await ShoppingList.findById(id)
        .populate('friday')
        .populate('saturday')
        .populate('sunday')
        .populate('monday')
        .populate('tuesday')
        .populate('wednesday')
        .populate('thursday')
        .populate('lunchWeekday')
        .populate('lunchWeekend')
        .populate('breakfast')

    //finds all the catList keys used to sort the shopping list
    let catUser = await Category.find({author: req.user.id})
    let catArray = catUser[0].catList

    // Copies the list to the clip board (uses copyToClip from utils)
    let copyList
    if(Object.keys(shoppingListFinal.items[0]).length !== 0){
        copyList = copyListFunc(shoppingListFinal.items, catArray)
    }else{
        copyList = 'Please re-edit your shoppinglist and submit your choosen items'
    }

    // Sends list ids to broswer, so unused localstorage can be deleted
    const allShoppingLists = await ShoppingList.find({ author: req.user._id })
    let allShoppingListIds = []
    for(let i = 0; i < allShoppingLists.length; i++){
        allShoppingListIds.push(allShoppingLists[i].id)
    }
    const showAllShoppingListIds = JSON.stringify(allShoppingListIds)

    res.render('shoppinglist/show', { showAllShoppingListIds, shoppingListFinal, copyList, catArray, title: `View ${shoppingListFinal.name}`, page: 'slShow' })
}


// Delete - Shoppinglist
module.exports.delete = async (req, res) => {
    const { id } = req.params
    let deletedShoppingList = await ShoppingList.findByIdAndDelete(id);

    req.flash('success', `Succesfully deleted '${deletedShoppingList.name}'`);
    res.redirect('/shoppinglist');
}


// DEFAULT(GET) - shoppinglist (sets up default meals for a particular day)
module.exports.defaultGet = async (req, res) => {

    const meals = await Meal.find({ author: req.user._id }).populate('author')
    meals.sort((a, b) => a.mealName.localeCompare(b.mealName));
    res.render('shoppinglist/default', { meals, title: 'Change Daily Default Meals', page: 'slDefault' })

}


// DEFAULT(PATCH) - shoppinglist (sets up default meals for a particular day)
module.exports.defaultPatch = async (req, res) => {

    const defaults = req.body

    // Removing all defaults from all meals
    await Meal.updateMany({ author: req.user._id }, { $set: { default: 'unAssig' } })

    // Removing the 'unAssig' default and adding the desired default to the relevant day
    for (d in defaults) {        
        if(defaults[d] !== 'none'){
            // Mongo can't do two things at once so pull and push have to be done separately
            await Meal.findOneAndUpdate(
                { $and: [{ _id: defaults[d], }, { author: req.user._id }] },
                { $pull: { default: 'unAssig' } }
            )
            await Meal.findOneAndUpdate(
                { $and: [{ _id: defaults[d], }, { author: req.user._id }] },
                { $push: { default: d } }
            )
        }
    }

    req.flash('success', `Succesfully updated your Default Meals!`);
    res.redirect('/shoppinglist/new')

}