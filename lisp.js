function typeParse (str) {
  try { return parseFloat(str) } catch (err) {
    try { return parseInt(str) } catch (err) {
      return str
    }
  }
}
const envDict = {
  '+': (input) => input.reduce((a, b) => a + b, 0),
  '-': (input) => input.reduce((a, b) => a - b, 0),
  '*': (input) => input.reduce((a, b) => a * b),
  '/': (input) => input.reduce((a, b) => a / b)
}

function Arithparser (input, initial = true) {
  const arr = []
  let operand = ''
  const pattern = /^ *(\d+) *(.*)/ims.exec(input)
  if (pattern) return [typeParse(pattern[1]), pattern[2]]
  if (!input.startsWith('(')) return null
  input = input.slice(1).trimStart()
  while (!input.startsWith(')') && input.length) {
    const match = /(^[^()\s]+)(.*)/.exec(input)
    if (!match) return null
    if (!initial) { arr.push(typeParse(match[1])) }
    if (initial) {
      if (!match || !(match[1] in envDict)) return null
      operand = match[1]; initial = false
    }
    input = match[2] ? match[2].trimStart() : ''
    if (input.startsWith('(')) {
      const res = Arithparser(input)
      if (!res) return null
      arr.push(typeParse(res[0]))
      input = res[1].trimStart()
    }
  }
  return [envDict[operand](arr), input.slice(1)]
}
// console.log(Arithparser('(* 2 (+ 3 (+ 2 3 -1)))'))
// console.log(Arithparser('(- 2 )'))
// console.log(Arithparser('(+ 1( * 5   (* 6 2 (/ 2 2 2))      1)5)'))

function beginParser (input) {
  const match = /^\( *begin *(.*)/ims.exec(input)
  if (!match) return null
  let rest = match[1]; let result = ''
  const fnarray = [Arithparser, beginParser]
  do {
    for (const item of fnarray) {
      result = item(rest.trimStart())
      if (result) break
    }
    rest = result[1]
  } while (!rest.startsWith(')'))
  return [result[0], rest.slice(1)]
}
console.log(beginParser('(  begin (+ 11 11) (+ 10 11) (+ 10 10))'))
console.log(beginParser('(  begin (begin (+ 10 11)) (+ 10 10))'))

function defParser (input, global = {}) {
  const match = /^\( *define *([^ ]) +(.*)/ims.exec(input)
  if (!match) return null
  const rest = match[2]; let result = ''
  const fnarray = [Arithparser]
  for (const item of fnarray) {
    result = item(rest.trimStart())
    if (result) break
  }
  if (!result[1].trimStart().startsWith(')')) return null
  global[match[1]] = result[0]
  return [global, result[1].slice(1)]
}

console.log(defParser('(define r 10)'))
console.log(defParser('(define r (+ 1 1))'))
