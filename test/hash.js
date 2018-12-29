const hyperlog = require('../src')
const tape = require('tape')
const memdb = require('memdb')
const framedHash = require('framed-hash')
const multihashing = require('multihashing')
const base58 = require('bs58')

function sha1 (links, value) {
  var hash = framedHash('sha1')
  for (var i = 0; i < links.length; i++) hash.update(links[i])
  hash.update(value)
  return hash.digest('hex')
}

function asyncSha2 (links, value, cb) {
  process.nextTick(function () {
    var prevalue = value.toString()
    links.forEach(function (link) { prevalue += link })
    var result = base58.encode(multihashing(prevalue, 'sha2-256'))
    cb(null, result)
  })
}

tape('add node using sha1', async (t) => {
  const hyper = hyperlog(memdb(), {
    hash: sha1
  })

  const node = await hyper.add(null, 'hello world')
  t.same(node.key, '99cf70777a24b574b8fb5b3173cd4073f02098b0')
  t.end()
})

tape('add node with links using sha1', async (t) => {
  const hyper = hyperlog(memdb(), {
    hash: sha1
  })

  const node = await hyper.add(null, 'hello')
  t.same(node.key, '445198669b880239a7e64247ed303066b398678b')
  const node2 = await hyper.add(node, 'world')
  t.same(node2.key, '1d95837842db3995fb3e77ed070457eb4f9875bc')
  t.end()
})

tape('add node using async multihash', async (t) => {
  const hyper = hyperlog(memdb(), {
    asyncHash: asyncSha2
  })

  const node = await hyper.add(null, 'hello world')
  t.same(node.key, 'QmaozNR7DZHQK1ZcU9p7QdrshMvXqWK6gpu5rmrkPdT3L4')
  t.end()
})

tape('add node with links using async multihash', async (t) => {
  const hyper = hyperlog(memdb(), {
    asyncHash: asyncSha2
  })

  const node = await hyper.add(null, 'hello')
  t.same(node.key, 'QmRN6wdp1S2A5EtjW9A3M1vKSBuQQGcgvuhoMUoEz4iiT5')
  const node2 = await hyper.add(node, 'world')
  t.same(node2.key, 'QmVeZeqV6sbzeDyzhxFHwBLddaQzUELCxLjrQVzfBuDrt8')
  const node3 = await hyper.add([node, node2], '!!!')
  t.same(node3.key, 'QmNs89mwydjboQGpvcK2F3hyKjSmdqQTqDWmRMsAQnL4ZU')
  t.end()
})

tape('preadd event with async hash', async (t) => {
  const hyper = hyperlog(memdb(), {
    asyncHash: asyncSha2
  })

  let prenode = null
  hyper.on('preadd', (node) => {
    prenode = node
  })

  hyper.add(null, 'hello world').then((node) => {
    t.same(node.key, 'QmaozNR7DZHQK1ZcU9p7QdrshMvXqWK6gpu5rmrkPdT3L4')
    t.end()
  })
  t.equal(prenode.key, null)
})
