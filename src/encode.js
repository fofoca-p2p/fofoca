exports.encode = function (value, enc) {
  if (typeof enc === 'object' && enc.encode) {
    value = enc.encode(value)
  } else if (enc === 'json') {
    value = Buffer.from(JSON.stringify(value))
  }
  if (typeof value === 'string') value = Buffer.from(value)
  return value
}

exports.decode = function (value, enc) {
  if (typeof enc === 'object' && enc.decode) {
    return enc.decode(value)
  } else if (enc === 'json') {
    return JSON.parse(value.toString())
  } else if (enc === 'utf-8' || enc === 'utf8') {
    return value.toString()
  }
  return value
}
