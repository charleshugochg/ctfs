self.window = self
importScripts('html-css-sanitizer-minified.js')

const PROGRESS_DELAY = 500
const ASCII_MAP = new Map((function(){
  const codes = []
  for (let i=0; i < 128; i++)
    codes.push(i)
  return codes
})().map(code => ([code, codetochar(code)])))

var last_progress = Date.now()

function codetochar (code) {
  const hex = ('0' + code.toString(16)).slice(-2)
  return eval(`'\\x${hex}'`)
}

function generate(start, end, cb, options={}) {
  let { prefix, suffix, filters } = {
    prefix: options.prefix || '',
    suffix: options.suffix || '',
    filters: options.filters || []
  }

  const falsies = []
  for (let i=start; i<end; i++){
    const c = ASCII_MAP.get(i)
    if (filters.includes(c)) continue
    const set = prefix + c + suffix
    if (cb(set)) falsies.push(set)
  }
  return falsies
}

function watch (set) {
  const res = html_sanitize(set)
  if (res !== set) log(set, res)
  else progress(set)
  return res !== set
}

function log(...msg) {
  postMessage({ action: 'log', msg })
}

function progress (...msg) {
  const now = Date.now()
  if (now - last_progress > PROGRESS_DELAY) {
    postMessage({ action: 'progress', msg })
    last_progress = now
  }
}

function go () {
  log('Started:', new Date())
  const filters = ['&', '<', '>']
  generate(0x00, 0x7f, function (set) {
    generate(0x00, 0x7f, function (set) {
      generate(0x00, 0x7f, function (set) {
        generate(0x00, 0x7f, function (set) {
          generate(0x00, 0x7f, watch, {
            prefix: set,
            filters
          }).forEach(function (f) {
            filters.push(f)
          })
        }, {
          prefix: set,
          filters
        })
      }, {
        prefix: set,
        filters
      })
    }, {
      prefix: set,
      filters
    })
  }, {
    filters
  })
  log('filters', ...filters)
  log('Ended:', new Date())
  postMessage({ action: 'done' })
}

function handler (event) {
  const { action }= event.data
  switch(action) {
    case 'go': go(); break;
    default: console.log('received unknown action from main:', action)
  }
}

addEventListener('message', handler)