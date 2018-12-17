const hyperlog = require('../')
const memdb = require('memdb')

const log = hyperlog(memdb())
const clone = hyperlog(memdb())

function sync (a, b) {
  a = a.createReplicationStream({ mode: 'push' })
  b = b.createReplicationStream({ mode: 'pull' })

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

  a.pipe(b).pipe(a)
}

clone.createReadStream({ live: true }).on('data', data => {
  console.log('change: (%d) %s', data.change, data.key)
})

log.add(null, 'hello', (err, node) => {
  if (err) throw err
  log.add(node, 'world', (err, node) => {
    if (err) throw err
    sync(log, clone)
    log.add(null, 'meh')
  })
})
