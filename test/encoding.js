var hyperlog = require('../src')
var tape = require('tape')
var memdb = require('memdb')
var collect = require('stream-collector')

tape('add node', async (t) => {
  var hyper = hyperlog(memdb(), { valueEncoding: 'json' })

  const node = await hyper.add(null, { msg: 'hello world' })
  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, { msg: 'hello world' })
  t.end()
})

tape('add node with encoding option', async (t) => {
  var hyper = hyperlog(memdb())

  const node = await hyper.add(null, { msg: 'hello world' }, { valueEncoding: 'json' })
  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, { msg: 'hello world' })
  t.end()
})

tape('append node', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })
  const node = await hyper.append({ msg: 'hello world' })

  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, { msg: 'hello world' })
  t.end()
})

tape('append node with encoding option', async (t) => {
  const hyper = hyperlog(memdb())
  const node = await hyper.append({ msg: 'hello world' }, { valueEncoding: 'json' })
  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, { msg: 'hello world' })
  t.end()
})

tape('add node with links', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })

  const node = await hyper.add(null, { msg: 'hello' })
  const node2 = await hyper.add(node, { msg: 'world' })
  t.ok(node2.key, 'has key')
  t.same(node2.links, [node.key], 'has links')
  t.same(node2.value, { msg: 'world' })
  t.end()
})

tape('cannot add node with bad links', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })

  try {
    await hyper.add('i-do-not-exist', { msg: 'hello world' })
  } catch (err) {
    t.ok(err, 'had error')
    t.ok(err.notFound, 'not found error')
    t.end()
  }
})

tape('heads', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })

  hyper.heads(async (err, heads) => {
    t.error(err)
    t.same(heads, [], 'no heads yet')

    const node = await hyper.add(null, 'a')
    hyper.heads(async (err, heads) => {
      t.error(err)
      t.same(heads, [node], 'has head')
      const node2 = await hyper.add(node, 'b')
      hyper.heads((err, heads) => {
        t.error(err)
        t.same(heads, [node2], 'new heads')
        t.end()
      })
    })
  })
})

tape('heads with encoding option', async (t) => {
  const hyper = hyperlog(memdb())

  hyper.heads({ valueEncoding: 'json' }, async (err, heads) => {
    t.error(err)
    t.same(heads, [], 'no heads yet')
    const node = await hyper.add(null, 'a', { valueEncoding: 'json' })
    hyper.heads({ valueEncoding: 'json' }, async (err, heads) => {
      t.error(err)
      t.same(heads, [node], 'has head')
      const node2 = await hyper.add(node, 'b', { valueEncoding: 'json' })
      hyper.heads({ valueEncoding: 'json' }, (err, heads) => {
        t.error(err)
        t.same(heads, [node2], 'new heads')
        t.end()
      })
    })
  })
})

tape('get', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })

  const node = await hyper.add(null, { msg: 'hello world' })
  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, { msg: 'hello world' })
  hyper.get(node.key, (err, node2) => {
    t.ifError(err)
    t.same(node2.value, { msg: 'hello world' })
    t.end()
  })
})

tape('get with encoding option', async (t) => {
  const hyper = hyperlog(memdb())

  const node = await hyper.add(null, { msg: 'hello world' }, { valueEncoding: 'json' })
  t.ok(node.key, 'has key')
  t.same(node.links, [])
  t.same(node.value, { msg: 'hello world' })
  hyper.get(node.key, { valueEncoding: 'json' }, (err, node2) => {
    t.ifError(err)
    t.same(node2.value, { msg: 'hello world' })
    t.end()
  })
})

tape('deduplicates', async (t) => {
  const hyper = hyperlog(memdb(), { valueEncoding: 'json' })

  await hyper.add(null, { msg: 'hello world' })
  await hyper.add(null, { msg: 'hello world' })
  collect(hyper.createReadStream(), (err, changes) => {
    t.error(err)
    t.same(changes.length, 1, 'only one change')
    t.end()
  })
})

tape('live replication encoding', async (t) => {
  t.plan(1)
  const h0 = hyperlog(memdb(), { valueEncoding: 'json' })
  const h1 = hyperlog(memdb(), { valueEncoding: 'json' })
  h1.createReadStream({ live: true }).on('data', (data) => {
    t.deepEqual(data.value, { msg: 'hello world' })
  })

  const r0 = h0.replicate({ live: true })
  const r1 = h1.replicate({ live: true })

  await h0.add(null, { msg: 'hello world' })
  r0.pipe(r1).pipe(r0)
})
