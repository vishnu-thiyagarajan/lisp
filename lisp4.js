const uuid = require('uuid/v4');
const hash = require('object-hash');
const parent = {}
const scope = {
  global : {
  list: input => input,
  "+": input => input.reduce((a, b) => a + b, 0),
  "*": input => input.reduce((a, b) => a * b, 1),
  "/": input => input.reduce((a, b) => a / b, 1),
  min: input => Math.min(...input),
  max: input => Math.max(...input),
  not: input => !input.every(val => (val ? true : false)),
  "-": input => {
    if (input.length == 1) return -1 * input[0];
    return input.reduce((a, b) => a - b);
  },
  ">": input => {
    let res = input.reduce((a, b) => (a > b ? b : NaN));
    return res ? true : false;
  },
  "<": input => {
    let res = input.reduce((a, b) => (a < b ? b : NaN));
    return res ? true : false;
  },
  "<=": input => {
    let res = input.reduce((a, b) => (a <= b ? b : NaN));
    return res ? true : false;
  },
  ">=": input => {
    let res = input.reduce((a, b) => (a >= b ? b : NaN));
    return res ? true : false;
  },
  "==": input => {
    let res = input.reduce((a, b) => (a == b ? b : NaN));
    return res ? true : false;
  },
  "!=": input => {
    let res = input.reduce((a, b) => (a != b ? b : NaN));
    return res ? true : false;
  }
}}

const ref = {
  begin: beginParser,
  define: defParser,
  set: defParser,
  if: ifParser,
  lambda: lambdaParser,
  count: countParser,
  range: rangeParser
};

function rangeParser(input) {
  let match = /^ *([^\s]+) +([^\s]+)( +([^\s]+))?/.exec(input);
  if (!match) return null;
  let start = atomicValue(match[1])[0],
    end = atomicValue(match[2])[0];
  let inc = match[4] ? atomicValue(match[4])[0] : 1;
  let ans = [],
    flag = 0;
  if (start > end) {
    [start, end] = [end, start];
    flag = 1;
  }
  if (inc < 0) inc *= -1;
  for (let i = start; i <= end; i += inc) {
    ans.push(i);
  }
  return [flag ? ans.reverse() : ans, ""];
}

function countParser(input) {
  var [needCountOf, input] = evaluator(input);
  input = evaluator(input)[0];
  if (typeof input == "string")
    return [input.split(needCountOf).length - 1, ""];
  return [input.filter(x => x == needCountOf).length, ""];
}

function normalForm(operator, input, dict = scope["global"]) {
  let rest,
    result,
    arr = [];
  while (input) {
    [result, rest] = evaluator(input, dict);
    arr.push(result);
    input = rest;
  }
  return [envFind(operator, dict)(arr), input];
}


function lambdaParser(input, env = scope["global"]) {
  let match = /^ *\((.+?)\) +(.+)/.exec(input);
  if (!match) return null;
  let rest,
    result,
    vars = match[1].split(" ");
  let value = function(val) {
    let currentEnv = {}
    for (key in vars) {
      atomVal = atomicValue(val[key]);
      currentEnv[vars[key]] = atomVal ? atomVal[0] : null;
    }
    let uuidCurrentScope = hash(currentEnv)
    scope[uuidCurrentScope] = currentEnv
    if (!parent[uuidCurrentScope]) parent[uuidCurrentScope] = env==scope["global"]?"global":hash(env);
    [result, rest] = evaluator(match[2], currentEnv);
    return result;
  };
  return [value, rest];
}

function quoteParser(input) {
  let result = "",
    rest = input,
    cnt = 0;
  do {
    if (rest.slice(0, 1) == "(") cnt += 1;
    if (rest.slice(0, 1) == ")") cnt -= 1;
    result += rest.slice(0, 1);
    rest = rest.slice(1);
  } while (!(cnt == 0 && rest.trimStart().startsWith(")")));
  return [result, rest.slice(1)];
}

function ifParser(input, dict = scope["global"]) {
  let match = /^ *(\(.+?\)) +(.+?) +(.+)/.exec(input);
  if (!match) return null;
  var [result, rest] = evaluator(match[1], dict);
  return result ? evaluator(match[2], dict) : evaluator(match[3], dict);
}

function defParser(input, dict = scope["global"]) {
  let match = /^(.*?) +(.*)/.exec(input);
  if (!match) return null;
  let [result, rest] = evaluator(match[2], dict);
  dict[match[1]] = result;
  return [dict, rest];
}

function beginParser(input, dict) {
  let result,
    rest = input;
  do {
    [result, rest] = evaluator(rest, dict);
  } while (rest);
  return [result, rest];
}

function atomicValue(input, dict = scope["global"]) {
  if (typeof input == "function") return [input,'']
  let float = /^ *([0-9]+\.[0-9]+)? *(.*)/.exec(input);
  if (float && float[1]) return [parseFloat(float[1]), float[2]];
  let number = /^ *([+-]?[0-9]+)? *(.*)/.exec(input);
  if (number && number[1]) return [parseInt(number[1]), number[2]];
  let str = /^ *(\"([0-9a-zA-Z]+)\")? *(.*)/.exec(input);
  if (str && str[1]) return [str[2], str[3]];
  let variable = /^ *([a-zA-Z]+)? *(.*)/.exec(input);
  if (variable && variable[1]) {
    return [envFind (variable[1], dict),variable[2]];
    // return [dict[variable[1]], variable[2]];
  }
}

function envFind(symbol, currentEnv){
  let hashCurrentEnv = currentEnv
  if (currentEnv == "global"){
  if (scope[currentEnv][symbol]) return scope[currentEnv][symbol]
  return null
  }
  if (currentEnv == scope["global"]) return currentEnv[symbol]
  if (typeof currentEnv !== "string") hashCurrentEnv = hash(currentEnv)
  if (scope[hashCurrentEnv] && scope[hashCurrentEnv][symbol]) return scope[hashCurrentEnv][symbol]
  
  return envFind(symbol, parent[hashCurrentEnv])
}

function evaluator(input, dict = scope["global"]) {
  let result, innerRest;
  let outterRest = input;
  let isAtomic = atomicValue(outterRest, dict);
  if (isAtomic) return isAtomic;
  let grps = new RegExp("^ *\\( *(.+?) +(.*)", "ims").exec(outterRest);
  if (grps) [innerRest, outterRest] = quoteParser(grps[2]);
  if (grps && grps[1] == "quote") return [innerRest, outterRest];
  if (grps && grps[1] in ref) {
    if (innerRest && grps[1] == "lambda") {[result, innerRest] = ref[grps[1]](innerRest, dict);} 
    else { if (innerRest) [result, innerRest] = ref[grps[1]](innerRest, dict);}
  }
  if (grps && envFind(grps[1],dict)) {
    if (innerRest) [result, innerRest] = normalForm(grps[1], innerRest, dict);
  }
  return [result, outterRest];
}
// console.log(scope)
// console.log(evaluator('(begin (+ 20 10) (define s "made"))'))
// console.log(evaluator('(begin (define r (+ 20 10)) (define s r))'))
// console.log(evaluator('(begin (define r (+ 20 10)) (define s 10) (define t (+ s r)) t)'))
// console.log(evaluator('(begin (define r (+ 20 10)) (define s 10))'))
// console.log(evaluator('(begin (define r 10) (* 3.14 (* r r)))'))
// console.log(evaluator('(if (- 1 1) "yes" "no")'))
// console.log(evaluator('(quote (quote "one"))'))
// console.log(evaluator('(quote (+ 1 2))'))
// console.log(evaluator('(>= 4 3 2)'))
// console.log(evaluator('(max 4 3 2)'))
// console.log(evaluator('(begin (define r (+ 20 10)) (define s 10))'))
// console.log(evaluator('(begin (define r 20) (+ r 2))'))
// console.log(evaluator("(define circle (lambda (r) (* 3.14 (* r r))))"))
// console.log(evaluator('(circle 10)'))
// console.log(scope)
// console.log({parent})
// console.log(evaluator('(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))'))
// console.log(evaluator('(fact 4)'))
console.log(evaluator('(define fib (lambda (n) (if (< n 2) 1 (+ (fib (- n 1)) (fib (- n 2))))))'))
console.log(evaluator('(fib 5)'))
// console.log(evaluator('(list 1 1 2)'))
// console.log(evaluator('(count 0 (list 0 1 2 3 0 0))'))
// console.log(evaluator('(count (quote the) (quote (the more the merrier the bigger the better)))'))
// console.log(evaluator('(circle (fact 10))'))
// console.log(evaluator('(define add (lambda (x y z) (+ x y z)))'))
// console.log(evaluator('(add 4 5 6)'))
// console.log(evaluator('(range 0 10)'))
// console.log(evaluator('(range 0 10 2)'))
// console.log(evaluator('(range 10 0 -2)'))
// console.log(evaluator('(range 10 0)'))
console.log(evaluator('(define twice (lambda (x) (* 2 x)))'))
// console.log(evaluator('(twice (twice (twice 5)))'))
console.log(evaluator('(define repeat (lambda (f) (lambda (x) (f (f x)))))'))
console.log(evaluator('(define test (repeat twice))'))
console.log(evaluator('(test 10)'))
// console.log(parent)
// let x = scope["global"].repeat(scope["global"].twice)
// console.log(x(2))
// console.log(evaluator('(define val (repeat twice))'))
// console.log(evaluator('(val 10)'))
// console.log(evaluator('(define z (lambda (x) (lambda (x) (+ x 1))))'))
// console.log(evaluator('((z 10) 12)'))

