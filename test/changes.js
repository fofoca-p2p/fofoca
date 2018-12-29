const hyperlog = require('../src')
const tape = require('tape')
const memdb = require('memdb')
const collect = require('stream-collector')

tape('changes', async (t) => {
  const hyper = hyperlog(memdb())

  const a = await hyper.add(null, 'a')
  const b = await hyper.add(null, 'b')
  const c = await hyper.add(null, 'c')
  collect(hyper.createReadStream(), (err, changes) => {
    t.error(err)
    t.same(changes, [a, b, c], 'has 3 changes')
    t.end()
  })
})

tape('changes since', async (t) => {
  const hyper = hyperlog(memdb())

  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  const c = await hyper.add(null, 'c')
  collect(hyper.createReadStream({ since: 2 }), (err, changes) => {
    t.error(err)
    t.same(changes, [c], 'has 1 change')
    t.end()
  })
})

tape('live changes', async (t) => {
  const hyper = hyperlog(memdb())
  const expects = ['a', 'b', 'c']

  hyper.createReadStream({ live: true })
    .on('data', (data) => {
      const next = expects.shift()
      t.same(data.value.toString(), next, 'was expected value')
      if (!expects.length) t.end()
    })
  await hyper.add(null, 'a')
  await hyper.add(null, 'b')
  await hyper.add(null, 'c')
})

tape('parallel add orders changes', (t) => {
  const hyper = hyperlog(memdb())

  let missing = 3
  var values = {}
  function done () {
    missing -= 1
    if (missing) return
    collect(hyper.createReadStream(), (err, changes) => {
      t.error(err)
      changes.forEach((c, i) => {
        t.same(c.change, i + 1, 'correct change number')
        values[c.value.toString()] = true
      })
      t.same(values, { a: true, b: true, c: true }, 'contains all values')
      t.end()
    })
  }

  hyper.add(null, 'a').then(done)
  hyper.add(null, 'b').then(done)
  hyper.add(null, 'c').then(done)
})
