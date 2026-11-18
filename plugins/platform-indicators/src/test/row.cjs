const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const source = fs.readFileSync(path.join(__dirname, '../../index.js'), 'utf8')
function start(os, available) {
  let before, after
  const noop = () => {}
  const config = { crimson: false }
  const host = {
    react: { React: { createElement: noop }, ReactNative: { Image: {}, View: {}, Platform: { OS: os } } },
    discord: {
      flux: { Stores: { PresenceStore: { getState: () => ({
        clientStatuses: { user: { desktop: 'online', mobile: 'dnd' } },
      }) } } },
      design: {}, utils: { modules: { finders: { getModuleWithImportedPath: noop } } },
    },
    modules: {
      native: { callNativeMethodSync(_, icons) {
        assert.equal(icons.length, 5)
        assert.ok(icons.every(uri => Buffer.from(uri.split(',')[1], 'base64').subarray(1, 4).toString() === 'PNG'))
        return available
      } },
      finders: {
        filters: { withName: noop, withProps: k => k, createFilterGenerator: () => noop },
        getModules(filter, cb) {
          if (filter === 'generateMessageRowData') cb({ generateMessageRowData: noop })
        },
      },
    },
    patcher: { before(_, k, cb) { before = cb; return noop }, after(_, k, cb) { after = cb; return noop } },
  }
  const plugin = vm.runInNewContext(source, { plugin: x => x, valenced: host }).default
  plugin.start({ cleanup: noop, jsonStorage: { cache: config }, plugin: {}, logger: { error(e) { throw Error(e) } } })
  return { config, render(row, author = { id: 'user' }) {
    before([{ message: { type: 0, author } }])
    return after(row)
  } }
}

const row = { message: { timestamp: '17:06', timestampAccessibilityLabel: '17 horas', clanTag: 'OMNI' } }
const session = start('android', true)
const decorated = session.render(row)
assert.equal(row.message.timestamp, '17:06')
assert.equal(decorated.message.timestampAccessibilityLabel, '17 horas')
assert.equal(decorated.message.clanTag, 'OMNI')
assert.equal(session.render(decorated), decorated)
assert.equal(session.render(row, { id: 'user', bot: true }), row)
session.config.nativeMessageSymbols = false
assert.equal(session.render(decorated).message.timestamp, '17:06')
for (const host of [start('ios', false), start('android', false)]) assert.equal(host.render(row), row)
process.stdout.write(decorated.message.timestamp)
