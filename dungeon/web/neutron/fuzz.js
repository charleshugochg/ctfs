var logger, progress

function hex(code) {
  return ('0' + code.toString(16)).slice(-2)
}

function inoneline (set) {
  let str = ''
  for (let i=0; i < set.length; i++) {
    const code = set.charCodeAt(i)
    if (code > 0x1f && code < 0x7f)
      str += set.charAt(i)
    else str += '\\x' + hex(code)
  }
  return str
}

function log (...msg) {
  const box = document.createElement('code')
  msg = msg.join(', ')
  box.innerText = inoneline(msg)
  logger.appendChild(box)
  logger.scrollTop = logger.scrollHeight
}

function progress (...msg) {
  msg = msg.join(', ')
  progressbar.innerText = '[*] ' + inoneline(msg)
}

function initworker () {
  logger = document.getElementById('logger')
  progressbar = document.getElementById('progressbar')

  const worker = new Worker('./worker.js')
  worker.addEventListener('message', event => {
    const {action, msg} = event.data
    switch(action) {
      case 'log': log(...msg); break;
      case 'progress': progress(...msg); break;
      case 'done': worker.terminate(); break;
      default:
        console.log('received unknown action from worker:', action)
    }
  })
  worker.postMessage({action: 'go'})
}

window.addEventListener('load', initworker)