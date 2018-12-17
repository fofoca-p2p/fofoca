function indexOf (list, change) {
  let low = 0
  let high = list.length
  let mid = 0

  while (low < high) {
    mid = (low + high) >> 1
    if (change < list[mid].change) high = mid
    else low = mid + 1
  }

  return low
}

// A queue of hyperlog nodes that is sorted by the nodes' change #. The node
// with the lowest change # will be the first dequeued.
class SortedQueue {
  constructor () {
    this.list = []
    this.wait = null
    this.length = 0
  }

  push (entry, cb) {
    const i = indexOf(this.list, entry.change)
    if (i === this.list.length) this.list.push(entry)
    else this.list.splice(i, 0, entry)
    this.length++

    if (this.wait) this.pull(this.wait)
    if (cb) cb()
  }

  pull (cb) {
    if (!this.list.length) {
      this.wait = cb
      return
    }

    this.wait = null

    const next = this.list.shift()
    this.length--

    cb(next)
  }
}

module.exports = SortedQueue
