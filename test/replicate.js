const hyperlog = require('../src')
const tape = require('tape')
const memdb = require('memdb')
const pump = require('pump')
const through = require('through2')

function sync (a, b, cb) {
  const replicationStreamA = a.replicate()
  const replicationStreamB = b.replicate()
  return new Promise((resolve, reject) => {
    pump(replicationStreamA, replicationStreamB, replicationStreamA, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

function toJSON (log, cb) {
  return new Promise((resolve) => {
    const map = {}
    log.createReadStream()
      .on('data', function (node) {
        map[node.key] = { value: node.value, links: node.links }
      })
      .on('end', function () {
        resolve(map)
      })
  })
}

tape('clones', async (t) => {
  const hyper = hyperlog(memdb())
  const clone = hyperlog(memdb())

  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  await hyper.add(null, 'c')
  await sync(hyper, clone)
  const map1 = await toJSON(clone)
  const map2 = await toJSON(hyper)
  t.same(map1, map2, 'logs are synced')
  t.end()
})

tape('clones with valueEncoding', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })
  const clone = hyperlog(memdb(), { valueEncoding: 'json' })

  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  await hyper.add(null, 'c')
  await sync(hyper, clone)
  const map1 = await toJSON(clone)
  const map2 = await toJSON(hyper)
  t.same(map1, map2, 'logs are synced')
  t.end()
})

tape('syncs with initial subset', async (t) => {
  const hyper = hyperlog(memdb())
  const clone = hyperlog(memdb())

  await clone.add(null, 'a')
  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  await hyper.add(null, 'c')
  await sync(hyper, clone)
  const map1 = await toJSON(clone)
  const map2 = await toJSON(hyper)
  t.same(map1, map2, 'logs are synced')
  t.end()
})

tape('syncs with initial superset', async (t) => {
  const hyper = hyperlog(memdb())
  const clone = hyperlog(memdb())

  await clone.add(null, 'd')
  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  await hyper.add(null, 'c')
  await sync(hyper, clone)
  const map1 = await toJSON(clone)
  const map2 = await toJSON(hyper)
  t.same(map1, map2, 'logs are synced')
  t.end()
})

tape('process', async (t) => {
  const hyper = hyperlog(memdb())
  const clone = hyperlog(memdb())

  function process (node, enc, cb) {
    setImmediate(function () {
      cb(null, node)
    })
  }

  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  await hyper.add(null, 'c')
  const stream = hyper.replicate()
  pump(stream, clone.replicate({ process: through.obj(process) }), stream, async () => {
    const map1 = await toJSON(clone)
    const map2 = await toJSON(hyper)
    t.same(map1, map2, 'logs are synced')
    t.end()
  })
})

// bugfix: previously replication would not terminate
tape('shared history with duplicates', async (t) => {
  const hyper1 = hyperlog(memdb())
  const hyper2 = hyperlog(memdb())

  const doc1 = { links: [], value: 'a' }
  const doc2 = { links: [], value: 'b' }

  hyper1.batch([doc1], async (err) => {
    t.error(err)
    await sync(hyper1, hyper2)
    hyper2.batch([doc1, doc2], async (err, nodes) => {
      t.error(err)
      t.equals(nodes[0].change, 1)
      t.equals(nodes[1].change, 2)
      await sync(hyper1, hyper2)
      t.end()
    })
  })
})
