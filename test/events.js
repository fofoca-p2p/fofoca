const hyperlog = require('../src')
const tape = require('tape')
const memdb = require('memdb')

tape('add and preadd events', async (t) => {
  t.plan(10)
  const hyper = hyperlog(memdb())
  const expected = [ 'hello', 'world' ]
  const expectedPre = [ 'hello', 'world' ]
  const order = []

  hyper.on('add', (node) => {
    // at this point, the event has already been added
    t.equal(node.value.toString(), expected.shift())
    order.push('add ' + node.value)
  })
  hyper.on('preadd', (node) => {
    t.equal(node.value.toString(), expectedPre.shift())
    order.push('preadd ' + node.value)
    hyper.get(node.key, (err) => {
      t.ok(err.notFound)
    })
  })
  const node = await hyper.add(null, 'hello')
  const node2 = await hyper.add(node, 'world')
  t.ok(node2.key, 'has key')
  t.same(node2.links, [node.key], 'has links')
  t.same(node2.value, Buffer.from('world'))
  t.deepEqual(order, [
    'preadd hello',
    'add hello',
    'preadd world',
    'add world'
  ], 'order')
})
