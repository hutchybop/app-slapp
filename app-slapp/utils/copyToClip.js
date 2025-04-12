// Code to copy shoppinglist to clipboard
module.exports.copyListFunc = (shoppingListFinal, cat) => {

    // Required variables 
    let copyList = ''
    let listCats = []
    let check = []

    // Creates ordered list (using catList) of all cats in shoppingListFinal.items
    for(let c in shoppingListFinal[0]){
        listCats.push(shoppingListFinal[0][c][1])
    }
    for(let i of cat){
        if(listCats.includes(i)){
            check.push(i)
        }
    }

    // function to shorten code
    const createList = (c) => {
        for (const [key, value] of Object.entries(shoppingListFinal[0])) {
            if(check[c] === value[1]){
                if(value[0] == 1){
                    copyList += `${key}\n`
                }else{
                    copyList += `${value[0]} ${key}\n`
                }
            }
        }
    }

    // loops to produce copyList, which is an ordered list of all items required.
    if(Object.keys(shoppingListFinal[0]).length > 1){
        for(let c = 0; c < check.length; c++) {
            if(c !== 0){
                copyList += '\n'
                createList(c)
            }else{
                createList(c)
            }
        }
    }else{
        for(let i in shoppingListFinal[0]){
            if( shoppingListFinal[0][i][0] == 1){
                copyList += i
            }else{
                copyList += `${shoppingListFinal[0][i][0]} ${i}`
            }
        }
    }

    return copyList
}