module.exports.toUpperCase = (string) => {

    // Uppercases the first letter of each word of the name, trimming the white space at the end
    string = string.trim()
    string = string.split(" ")
    let stringUpper = ''
    for (i of string) {
        if(i !== ''){
            stringUpper += i[0].toUpperCase() + i.slice(1, i.length) + ' '
        }
    }
    stringUpper = stringUpper.trim()
    return stringUpper
}
