const hyperlog = require('../src')
const memdb = require('memdb')

const log = hyperlog(memdb())
const clone = hyperlog(memdb())

function sync (a, b) {
  a = a.createReplicationStream({ live: true })
  b = b.createReplicationStream({ live: true })

  a.on('push', () => {
    console.log('a pushed')
  })

  a.on('pull', () => {
    console.log('a pulled')
  })

  a.on('end', () => {
    console.log('a ended')
  })

  b.on('push', () => {
    console.log('b pushed')
  })

  b.on('pull', () => {
    console.log('b pulled')
  })

  b.on('end', () => {
    console.log('b ended')
  })

  b.on('sync', () => {
    console.log('b sync')
  })

  a.pipe(b).pipe(a)
}

sync(log, clone)

clone.createReadStream({ live: true }).on('data', data => {
  console.log('change: (%d) %s %s', data.change, data.key, data.value)
})

log.append('hello')
  .then(() => {
    return log.append('world')
  })
  .then(() => {
    return log.append('meh')
  })

setInterval(() => {
  log.append('lorem')
}, 2000)
