const framedHash = require('framed-hash')
const empty = Buffer.alloc(0)

module.exports = function (links, value) {
  const hash = framedHash('sha256')
  for (var i = 0; i < links.length; i++) hash.update(links[i])
  hash.update(value || empty)
  return hash.digest('hex')
}
