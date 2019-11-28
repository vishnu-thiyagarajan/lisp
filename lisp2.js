const envDict = {
    '+': (input) => input.reduce((a, b) => a + b, 0),
    '-': (input) => input.reduce((a, b) => a - b, 0),
    '*': (input) => input.reduce((a, b) => a * b),
    '/': (input) => input.reduce((a, b) => a / b),
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
function evaluvator(input="(begin (begin (define r 10) (* pi (* r r))))"){
    let number = /^ *([0-9]+)? *(.*)/.exec(input)
    if (number && number[1]) return [parseInt(number[1]),number[2]]
    let str = /^ *(\"([0-9a-zA-Z]+)\")? *(.*)/.exec(input)
    if (str && str[1]) return [str[2],str[3]]
    ref = {'begin' : beginParser,
           'define' : defParser,
        //    'if': ifParser,
           }
    let result,rest = input
    do{
        let grps = new RegExp('^ *\\\( *(.+?) +(.*)','ims').exec(rest)
        if (grps[1] in ref) [result,rest] = ref[grps[1]](grps[2])
        // if (grps[1] in envDict) [result,rest] = normal(grps[1],grps[2])
        if (rest.trimStart().startsWith(')')) break
    }while(rest)
    return rest ? [result,rest] : result
}
console.log(evaluvator('(begin (begin (define r "make")) (define s "made"))'))
// console.log(evaluvator('(  begin (+ 11 11) (+ 10 11) (+ 10 10))'))
// console.log(evaluvator('(  begin (begin (+ 10 11)) (+ 10 10))'))
