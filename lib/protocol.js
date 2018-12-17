const Duplexify = require('duplexify')
const util = require('util')
const lpstream = require('length-prefixed-stream')
const through = require('through2')
const debug = require('debug')('hyperlog-replicate')
const messages = require('./messages')

const empty = {
  encodingLength: function () {
    return 0
  },
  encode: function (data, buf, offset) {
    return buf
  }
}

function decodeMessage (data) {
  switch (data[0]) {
    case 0: return messages.Handshake.decode(data, 1)
    case 1: return messages.Log.decode(data, 1)
    case 2: return messages.Log.decode(data, 1)
    case 3: return messages.Node.decode(data, 1)
  }
  return null
}

class Protocol extends Duplexify {
  constructor(opts) {
    const frame = !opts || opts.frame !== false
    const encoder = frame ? lpstream.encode() : through.obj()
    const decoder = frame ? lpstream.decode() : through.obj()
    const hwm = opts.highWaterMark || 16

    super(decoder, encoder, frame ? {} : { objectMode: true, highWaterMark: hwm })

    this._encoder = encoder
    this._decoder = decoder
    this._finalize = opts.finalize ? opts.finalize : function (cb) { cb() }
    this._process = opts.process || null

    const parse = through.obj((data, enc, cb) => {
      this._decode(data, cb)
    })

    parse.on('error', (err) => {
      this.destroy(err)
    })

    this.on('end', () => {
      debug('ended')
      this.end()
    })

    this.on('finish', () => {
      debug('finished')
      this.finalize()
    })

    this._decoder.pipe(parse)

    if (this._process) {
      this._process.pipe(through.obj((node, enc, cb) => {
        this.emit('node', node, cb) || cb()
      }))
    }
  }

  handshake (handshake, cb) {
    debug('sending handshake')
    this._encode(0, messages.Handshake, handshake, cb)
  }

  have (have, cb) {
    debug('sending have')
    this._encode(1, messages.Log, have, cb)
  }

  want (want, cb) {
    debug('sending want')
    this._encode(2, messages.Log, want, cb)
  }

  node (node, cb) {
    debug('sending node')
    this._encode(3, messages.Node, node, cb)
  }

  sentHeads (cb) {
    debug('sending sentHeads')
    this._encode(4, empty, null, cb)
  }

  sentWants (cb) {
    debug('sending sentWants')
    this._encode(5, empty, null, cb)
  }

  finalize (cb) {
    this._finalize((err) => {
      debug('ending')
      if (err) return this.destroy(err)
      this._encoder.end(cb)
    })
  }

  _encode (type, enc, data, cb) {
    var buf = new Buffer(enc.encodingLength(data) + 1)
    buf[0] = type
    enc.encode(data, buf, 1)
    this._encoder.write(buf, cb)
  }

  _decode (data, cb) {
    try {
      var msg = decodeMessage(data)
    } catch (err) {
      return cb(err)
    }

    switch (data[0]) {
      case 0:
        debug('receiving handshake')
        return this.emit('handshake', msg, cb) || cb()

      case 1:
        debug('receiving have')
        return this.emit('have', msg, cb) || cb()

      case 2:
        debug('receiving want')
        return this.emit('want', msg, cb) || cb()

      case 3:
        debug('receiving node')
        return this._process ? this._process.write(msg, cb) : (this.emit('node', msg, cb) || cb())

      case 4:
        debug('receiving sentHeads')
        return this.emit('sentHeads', cb) || cb()

      case 5:
        debug('receiving sentWants')
        return this.emit('sentWants', cb) || cb()
    }

    cb()
  }
}

module.exports = Protocol
