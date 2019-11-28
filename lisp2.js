const envDict = {
    '+': (input) => input.reduce((a, b) => a + b),
    '-': (input) => input.reduce((a, b) => a - b),
    '*': (input) => input.reduce((a, b) => a * b),
    '/': (input) => input.reduce((a, b) => a / b),
}

const ref = {'begin' : beginParser,
             'define' : defParser,
             'if': ifParser,
             'quote': quoteParser,
}

function normalForm (operand, input, dict = envDict) {
    const arr = []
    while (!input.startsWith(')') && input.length) {
        let [result,rest] = evaluvator(input)
        arr.push(result)
        input = rest
    }
    return [envDict[operand](arr), input.slice(1)]
}

function quoteParser(input){
    let result='',rest=input,cnt = 0
    do{
        if (rest.slice(0,1) == "(") cnt += 1
        if (rest.slice(0,1) == ")") cnt -= 1
        result += rest.slice(0,1)
        rest = rest.slice(1)
    }while(!(cnt == 0 && rest.slice(0,1) == ")"))
    return [result,rest.slice(1)]
}

function ifParser (input, dict = envDict) {
    var [result,rest] = evaluvator(input)
    var [pass,rest] = evaluvator(rest)
    var [fail,rest] = evaluvator(rest)
    if (!rest.startsWith(')')) return null
    return result ? [pass,rest.slice(1)] : [fail,rest.slice(1)]
  }

function defParser (input, dict = envDict) {
    let match = /^(.*?) +(.*)/.exec(input)
    if (!match) return null
    let [result,rest] = evaluvator(match[2])
    dict[match[1]] = result
    if (!rest.trimStart().startsWith(')')) return null
    return [dict,rest.slice(1)]
  }

function beginParser (input) {
    let result,rest
    do {
        [result,rest] = evaluvator(input)
    } while (!rest.startsWith(')'))
    return [result, rest.slice(1)]
}

function atomicValue(input, dict=envDict){
    let number = /^ *([0-9]+)? *(.*)/.exec(input)
    if (number && number[1]) return [parseInt(number[1]),number[2]]
    let str = /^ *(\"([0-9a-zA-Z]+)\")? *(.*)/.exec(input)
    if (str && str[1]) return [str[2],str[3]]
    let variable = /^ *([a-zA-Z]+)? *(.*)/.exec(input)
    if (variable && variable[1]) return [dict[variable[1]],variable[2]]
}

function evaluvator(input){
    let isAtomic = atomicValue(input)
    if (isAtomic) return isAtomic
    let result,rest = input
    do{
        let grps = new RegExp('^ *\\\( *(.+?) +(.*)','ims').exec(rest)
        if (grps && grps[1] in ref) [result,rest] = ref[grps[1]](grps[2])
        if (grps && grps[1] in envDict) {[result,rest] = normalForm(grps[1],grps[2]); break}
        if (rest.trimStart().startsWith(')')) break
    }while(rest)
    return rest ? [result,rest] : result
}
// console.log(evaluvator('(begin (begin (define r "make")) (define s "made"))'))
// console.log(evaluvator('(begin (define r 1) (+ r 10))'))
// console.log(evaluvator('(if (- 1 1) "yes" "no")'))
// console.log(evaluvator('(quote one    two)'))
