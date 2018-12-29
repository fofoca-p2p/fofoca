const hyperlog = require('../src')
const tape = require('tape')
const memdb = require('memdb')

tape('sign', async (t) => {
  t.plan(3)

  const log = hyperlog(memdb(), {
    identity: Buffer.from('i-am-a-public-key'),
    sign: function (node, cb) {
      t.same(node.value, Buffer.from('hello'), 'sign is called')
      cb(null, Buffer.from('i-am-a-signature'))
    }
  })

  const node = await log.add(null, 'hello')
  t.same(node.signature, Buffer.from('i-am-a-signature'), 'has signature')
  t.same(node.identity, Buffer.from('i-am-a-public-key'), 'has public key')
  t.end()
})

tape('sign fails', async (t) => {
  t.plan(2)

  const log = hyperlog(memdb(), {
    identity: Buffer.from('i-am-a-public-key'),
    sign: function (node, cb) {
      cb(new Error('lol'))
    }
  })

  log.on('reject', function (node) {
    t.ok(node)
  })

  try {
    await log.add(null, 'hello')
  } catch (err) {
    t.same(err && err.message, 'lol', 'had error')
  }
})

tape('verify', async (t) => {
  t.plan(2)

  const log1 = hyperlog(memdb(), {
    identity: Buffer.from('i-am-a-public-key'),
    sign: (node, cb) => {
      cb(null, Buffer.from('i-am-a-signature'))
    }
  })

  const log2 = hyperlog(memdb(), {
    verify: (node, cb) => {
      t.same(node.signature, Buffer.from('i-am-a-signature'), 'verify called with signature')
      t.same(node.identity, Buffer.from('i-am-a-public-key'), 'verify called with public key')
      cb(null, true)
    }
  })

  await log1.add(null, 'hello')
  const stream = log2.replicate()
  stream.pipe(log1.replicate()).pipe(stream)
})

tape('verify fails', async (t) => {
  const log1 = hyperlog(memdb(), {
    identity: Buffer.from('i-am-a-public-key'),
    sign: (node, cb) => {
      cb(null, Buffer.from('i-am-a-signature'))
    }
  })

  const log2 = hyperlog(memdb(), {
    verify: (node, cb) => {
      cb(null, false)
    }
  })

  await log1.add(null, 'hello')
  const stream = log2.replicate()

  stream.on('error', function (err) {
    t.same(err.message, 'Invalid signature', 'stream had error')
    t.end()
  })
  stream.pipe(log1.replicate()).pipe(stream)
})

tape('per-document identity (add)', async (t) => {
  t.plan(2)

  const log1 = hyperlog(memdb(), {
    sign: (node, cb) => {
      cb(null, Buffer.from('i-am-a-signature'))
    }
  })

  const log2 = hyperlog(memdb(), {
    verify: (node, cb) => {
      t.same(node.signature, Buffer.from('i-am-a-signature'), 'verify called with signature')
      t.same(node.identity, Buffer.from('i-am-a-public-key'), 'verify called with public key')
      cb(null, true)
    }
  })

  const opts = { identity: Buffer.from('i-am-a-public-key') }
  log1.add(null, 'hello', opts)
  const stream = log2.replicate()
  stream.pipe(log1.replicate()).pipe(stream)
})

tape('per-document identity (batch)', async (t) => {
  t.plan(5)

  const log1 = hyperlog(memdb(), {
    sign: (node, cb) => {
      cb(null, Buffer.from('i-am-a-signature'))
    }
  })

  const expectedpk = [ Buffer.from('hello id'), Buffer.from('whatever id') ]
  const log2 = hyperlog(memdb(), {
    verify: (node, cb) => {
      t.same(node.signature, Buffer.from('i-am-a-signature'), 'verify called with signature')
      t.same(node.identity, expectedpk.shift(), 'verify called with public key')
      cb(null, true)
    }
  })

  log1.batch([
    {
      value: 'hello',
      identity: Buffer.from('hello id')
    },
    {
      value: 'whatever',
      identity: Buffer.from('whatever id')
    }
  ], (err, nodes) => {
    t.error(err, 'no err')
    const stream = log2.replicate()
    stream.pipe(log1.replicate()).pipe(stream)
  })
})
