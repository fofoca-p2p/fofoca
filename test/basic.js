const hyperlog = require('../src')
const tape = require('tape')
const memdb = require('memdb')
const collect = require('stream-collector')

tape('add node', async (t) => {
  const hyper = hyperlog(memdb())
  const node = await hyper.add(null, 'hello world')

  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, Buffer.from('hello world'))
  t.end()
})

tape('add node with links', async (t) => {
  const hyper = hyperlog(memdb())

  const node = await hyper.add(null, 'hello')
  const node2 = await hyper.add(node, 'world')

  t.ok(node2.key, 'has key')
  t.same(node2.links, [node.key], 'has links')
  t.same(node2.value, Buffer.from('world'))
  t.end()
})

tape('cannot add node with bad links', async (t) => {
  const hyper = hyperlog(memdb())

  try {
    await hyper.add('i-do-not-exist', 'hello world')
  } catch (err) {
    t.ok(err, 'had error')
    t.ok(err.notFound, 'not found error')
  } finally {
    t.end()
  }
})

tape('heads', async (t) => {
  const hyper = hyperlog(memdb())

  hyper.heads(async (err, heads) => {
    t.error(err)
    t.same(heads, [], 'no heads yet')
    const node = await hyper.add(null, 'a')
    hyper.heads(async (err, heads) => {
      t.error(err)
      t.same(heads, [node], 'has head')
      const node2 = await hyper.add(node, 'b')
      hyper.heads(function (err, heads) {
        t.error(err)
        t.same(heads, [node2], 'new heads')
        t.end()
      })
    })
  })
})

tape('deduplicates', async (t) => {
  const hyper = hyperlog(memdb())

  await hyper.add(null, 'hello world')
  await hyper.add(null, 'hello world')
  collect(hyper.createReadStream(), function (err, changes) {
    t.error(err)
    t.same(changes.length, 1, 'only one change')
    t.end()
  })
})

tape('deduplicates -- same batch', async (t) => {
  const hyper = hyperlog(memdb())
  const doc = { links: [], value: 'hello world' }

  hyper.batch([doc, doc], (err, nodes) => {
    t.error(err)
    collect(hyper.createReadStream(), (err, changes) => {
      t.error(err)
      t.same(changes.length, 1, 'only one change')
      t.same(hyper.changes, 1, 'only one change')
      t.end()
    })
  })
})

tape('bug repro: bad insert links results in correct preadd/add/reject counts', async (t) => {
  const hyper = hyperlog(memdb())

  let pending = 0
  hyper.on('preadd', (node) => { pending += 1 })
  hyper.on('add', (node) => { pending -= 1 })
  hyper.on('reject', (node) => { pending -= 1 })

  try {
    await hyper.add(['123'], 'hello')
  } catch (error) {
    t.ok(error)
  } finally {
    t.equal(pending, 0)
    t.end()
  }
})
