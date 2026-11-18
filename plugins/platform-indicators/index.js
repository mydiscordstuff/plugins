({default:(function(){
"use strict";
// Valenced evaluates plugin bundles during PREINIT, when React is not bound yet.
// Only declare variables/functions at top level. Resolve ALL host APIs in start().
let React, Image, View, Stores, Design, getModules;
let withName, withProps, createFilterGenerator, getModuleWithImportedPath;
let before, after;
function initializeRuntime() {
  React = valenced.react?.React;
  ({ Image, View } = valenced.react?.ReactNative ?? {});
  ({ Stores } = valenced.discord?.flux ?? {});
  ({ Design } = valenced.discord?.design ?? {});
  ({ getModules } = valenced.modules?.finders ?? {});
  ({ withName, withProps, createFilterGenerator } = valenced.modules?.finders?.filters ?? {});
  ({ getModuleWithImportedPath } = valenced.discord?.utils?.modules?.finders ?? {});
  ({ before, after } = valenced.patcher ?? {});
  if (!React?.createElement || !Image || !View || !Stores || !getModules ||
      !withName || !withProps || !createFilterGenerator ||
      !getModuleWithImportedPath || !before || !after)
    throw new Error('Valenced platform APIs unavailable at plugin start (requires matching Valenced version)');
}

/**
 * Platform Indicators 0.3.2 — Valenced / mydiscordstuff
 * Original idea and presence conventions: MSMA's Vendetta PlatformIndicators.
 * Bold custom PNG icons. No network requests, trackers, or outbound traffic.
 *
 * Android message timestamps use the same PNGs through the native renderer.
 */








const DEFAULTS = Object.freeze({
  dmList: true,
  members: true,
  profiles: true,
  dmHeader: true,
  friends: true,
  messageHeaders: true,
  nativeMessageSymbols: true,
  crimson: true,
  showOffline: false,
  iconSize: 17,
})
const MARKER = 'mydiscordstuff.pi.v32'
const RED = '#C93A55'
const COLORS = {
  online: '#37B875', idle: '#E5A42E', dnd: '#ED4351',
  offline: '#9196A5', invisible: '#9196A5',
}
const DEVICES = [
  ['desktop','Desktop'],['web','Web'],['mobile','Mobile'],
  ['embedded','Console'],['vr','VR'],
]
// Each data URI below is a transparent PNG icon. It is generated from assets/*.svg.
const ICON_URIS = {"console": "data:image/png;base64,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", "desktop": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAEHElEQVR4nO3dTWgdVRjG8f9zrdLGikEUGzSEFtF2YakWXLjwA7poIaCii+pCFEG7VRBBceFCd7a4cadUu7EKWsGFFUVciVZdiChKUFO1frVBpJWqtY+LSUyaNObeyT3zcjPvbxUmc2beOc/N3JkzuedCSimllFIbqdsVbZ8L3ATcDFwGjAAXlSlr4PwCHAYmgfeA9yW5m4ZLBmB7A/A4cBtw4TKKbJMJ4EXgGUm//9+KiwZg+wLgSeAB4Ly+ltceR4AHJb282ApnDcD2euB14OpChbXNPuA+SX/P/8WCAGxfAxwELmmgsDY5CNwh6fjchWcEYHsd8CEw2mBhbfIGcIuk0zMLOjM/2D4HeJXs/JLGgcfmLvjvL8D2vcDzTVfUQv8A10r6FKYDsL0a+Ip89TflTUk7YPYUtJPs/CZtt309zAZwa2AxbXUngGyvAY4CQ7H1tM6PwOWrgA303vkG3gG+7ndVA+oGYGOPbUaAMWxvc+8eLnAQA8v2attv1ejHGztUSfTq2X4fxCCTdBK4v0bT0Q6wpsYOT9TY2Yom6dsazYY6S6+TSsoAgmUAwTKAYBlAsAwgWAYQLAMIlgEEywCCZQDBMoBgGUCwDCBYBhAsAwiWAQTLAIJlAMEygGAZQLAMIFgGECwDCJYBBMsAgmUAwTKAYBlAsAwgWAYQLAMIlgEEywCCZQDBMoBgHarP/PbEdtdzzbVFzT5xh+pT8r3KqQ0WurJGm6kO8F2Nhs/Z3l6j3YpkeyOwt0bTI7J9MdW0i3laad5oR9JR4IPoSlpoQtL3M1dBr4SW0k6vweyMWZdSTTa6NrKilrlO0qEOgKSfgaeDC2qTA5IOwZmT9q0FPgPGoqpqiVPAZklfwJw74ekJRW8HTgYV1haPzHQ+zBuKkPQx1bw3p+e3Sn2xV9LuuQsWjAVJ2gfcBfzZVFUt8QKwa/7Csw7GSdoP7KCaEz8tzyngIUn3SFrwol50NFTSu8Am4Angr3L1rWhvU82Su2exFboafrA9QnVauhvY3J/aVqwJ4ACwX9JHS63c8/iP7WGqS9UxYF3P5dUzBjzaY5unqL5SpAm/Aj8BhyX90NA+m2N7a40pIbdG192NfCIWLAMItqqJndjuAOuB4Zqb2FSnjd3z09YZvwHfzP2mi4Fke9j2btvHapzDox1zVXvdF01Xij0Fs30F1XXwoA/uTQLbJE2U2HiRAGwPAZ8AV5XYfoAvqW6o/uj3hku9Ce9i5XQ+VMeyYBynH0oFsLPQdiMVOaZSp6DjwPklth3ohKS+P7LN+4BgpQL4vNB2IxU5plIBvFRou5GKHFNehnZnsC5Dpwsdp7nh4JImgfESnQ8F34Sn7xy3AHuAqVL7KWiKqvYtpe6CoaF/yPXyB+OatjIG41JKKaW0uH8Bisg10EtIc7IAAAAASUVORK5CYII=", "mobile": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAAE2klEQVR4nO2dTWhcZRSGn5OItfGXKprQav2DqoiLaguKClWpWESsQqVStKIiiNhuuxB0k6U2ClKroBW7UBRSQRArKXYh+IMbRUSRVEVtC7EVTU0szeviTrAiucmd75s59ybngUAgM+858z0zd+Z+E+6BwBXrZjFJi4HbgFXAUqAfOL/bfZzEFPArcAD4AfgC2G9mU91qoCsPXNI64BFgLXB6N2om8COwG3jVzL7zbiYJSaskjaiZHJc0JOkM73WsjKQeSYOSplyXMA+jkm7u1FplPwSpeMa8DqzPne3IJPCgmb2ZOzirAEmLgBHghpy5NWEKeNzMXsoZmlvALuCBnJk14wRwh5ntzRWYTYCkLcD2XHk1Zgy4zswO5AjLIkDSecD3wFk58hrAPjO7JUdQT44Q4CkWzuIDrJF0Z46g5FeApAGKM8lTk7tpFl8D15jZiZSQHK+A9Sy8xQe4Ckg+PzglQyN3tXGf48Au4F2KvRhl6KMdeoAVwFbg2jbuvwHYl9JA0iFIUh9whGqvgCMUH+U+mSV7EXAJ6XtH48ComU2W1OoFngWerJh9GBjo5ubdf5C0oo1T+3tmyVwm6TVJ48mbCP8y3spcVlLXJL3VRvbS/Cs7RyStqdjst7PkrZY01sYizJUxSatL6vdLOlYx8/qUNUx9Ex6oePvPZvqDpHOBPcCSpI7KWQLsadX6H2Z2EKh6lntRSkOpAs6sePs/Sv62leILmk7T36o1Ewcr5p2d0Eu2E7EclL43NLhWKXUScOk8rVVKnQRMzNNapdRJwIxv0A2vVUqdBOycp7VKqZOAd4DhLtQZbtWqBbURYGYCNlL8S0in2A1sbNWqBTk247JhZhPAJkkvApuAq4G+xNhjwFfAG2b2cWJWdmolYJrWQtVusTpBbQ5BC5UQ4EwIcCYEOBMCnAkBzoQAZ0KAMyHAmRDgTAhwJgQ4EwKcCQHOhABnQoAzIcCZEOBMCHAmBDgTApwJAc6EAGdCgDMhwJkQ4EwIcCYEOBMCnAkBzoQAZ0KAMyHAmRDgTAhwJgQ4EwKcCQHOhABnQoAzIcCZEOBMCHAmBDgTApyp5dVS5oKkc4AtFNedHjKz351baovGCgCeAza3fl8OPOzXSvs0+RB08nWgL3TrIpEmvwIGgSsoDkGDzr20TWMFmNk+GvzMnyb1EFT1je+CxHrdoOosnLLrYc9KqoCfKt5+raTaSpBkwIyXt5+BX1JqdltAHzCUWLOT3Ef160onCUhCUq+kw20MUtiuYmxIbZB0o6SjFR/HX5JOS6mbY4zVDuCxNu76OfA88A3FnEYPjGKw9N0U1ymt+qHkPTNLmieWQ8CtwIepOQ3lUTN7JSUgh4Be4EvgytSshjEJLDezQykhyWfCrUly21JzGsgLqYsPeaepfkSGyXIN4ShwmZn9lhqUcy9oM8Wo14XAthyLDxkFmNkocD/F0OP5zMtmtiNXWNbdUDP7AHgCv4+VnWY/xePLRvbt6Naz415qNCgnE28D68zs75yhHfk+wMyGgduB0U7kd5kp4Blgg5mNezdTCUmLJT0taaKN7Yo6sFfSyk6uUbaPoWVIuhx4iOJ0P2n2Yhf4E3gf2GlmVedKVqYrAqaR1APcBKwELm79DOD31aiAQxRDpX8GPgVGWrNsgoXAP0IiO0NeSOGzAAAAAElFTkSuQmCC", "vr": "data:image/png;base64,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", "web": "data:image/png;base64,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"}
let storageApi
let pluginRef

function setting(key) {
  return (storageApi?.cache || DEFAULTS)[key] ?? DEFAULTS[key]
}
function store(name) {
  try { return Stores?.[name] } catch { return undefined }
}
function statusMap(userId) {
  if (!userId) return {}
  try {
    const current = store('UserStore')?.getCurrentUser?.()?.id
    if (current === userId) {
      const result = {}
      const sessions = store('SessionsStore')?.getSessions?.() || {}
      for (const session of Object.values(sessions)) {
        const device = session?.clientInfo?.client
        if (device && device !== 'unknown' && typeof session.status === 'string')
          result[device] = session.status
      }
      if (Object.keys(result).length) return result
    }
  } catch {}
  try {
    const p = store('PresenceStore')
    const cs = p?.getState?.()?.clientStatuses
    const found = cs?.[userId] || cs?.get?.(userId) || p?.getClientStatuses?.(userId)
    return found && typeof found === 'object' ? found : {}
  } catch { return {} }
}
function snapshot(id) {
  const statuses = statusMap(id)
  return DEVICES.map(([key]) => `${key}:${statuses[key] || ''}`).join('|')
}
function watchPresence(cb) {
  const disposes = []
  for (const name of ['PresenceStore','SessionsStore']) {
    const s = store(name)
    if (typeof s?.addChangeListener !== 'function') continue
    try {
      s.addChangeListener(cb)
      disposes.push(() => s.removeChangeListener?.(cb))
    } catch {}
  }
  return () => { for (const fn of disposes) { try { fn() } catch {} } }
}
function Badge({ userId, compact = false }) {
  // This hook must stay inside the React component, not the patch callback.
  const config = storageApi?.use?.() || DEFAULTS
  const getSnap = React.useCallback(() => snapshot(userId), [userId])
  React.useSyncExternalStore(watchPresence, getSnap, getSnap)
  const statuses = statusMap(userId)
  const active = DEVICES.filter(([key]) => {
    const state = statuses[key]
    return typeof state === 'string' &&
      ((config.showOffline ?? DEFAULTS.showOffline) || (state !== 'offline' && state !== 'invisible'))
  })
  if (!active.length) return null
  const size = compact ? 15 : (config.iconSize || 17)
  return React.createElement(View, {
    style: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 3 },
    accessible: true,
    accessibilityLabel: active.map(([key, label]) => `${label}: ${statuses[key]}`).join(', '),
  }, ...active.map(([key, label]) => React.createElement(Image, {
    key,
    source: { uri: ICON_URIS[key === 'embedded' ? 'console' : key], width: size, height: size },
    accessibilityLabel: `${label}: ${statuses[key]}`,
    style: { width: size, height: size, marginHorizontal: 2,
      tintColor: config.crimson === false ? (COLORS[statuses[key]] || RED) : RED },
  })))
}
function badge(id, compact = false) {
  return React.createElement(Badge, { key: MARKER, userId: id, compact })
}
function hasElement(node) {
  return React.isValidElement(node)
}
function markerExists(node, depth = 0) {
  if (depth > 18 || !hasElement(node)) return false
  if (node.type === Badge || node.key === MARKER) return true
  const children = node.props?.children
  if (Array.isArray(children)) return children.some(c => markerExists(c, depth + 1))
  return markerExists(children, depth + 1)
}
function rowWithBadge(node, id, compact) {
  if (!id || markerExists(node)) return node
  return React.createElement(View, {
    style: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
    key: MARKER + '.row',
  }, node, badge(id, compact))
}
function replaceFirst(root, test, replace, depth = 0) {
  if (!hasElement(root) || depth > 28) return root
  if (test(root)) return replace(root)
  const children = root.props?.children
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const newer = replaceFirst(children[i], test, replace, depth + 1)
      if (newer !== children[i]) {
        const copy = [...children]
        copy[i] = newer
        return React.cloneElement(root, { children: copy })
      }
    }
  } else if (hasElement(children)) {
    const newer = replaceFirst(children, test, replace, depth + 1)
    if (newer !== children) return React.cloneElement(root, { children: newer })
  }
  return root
}
function getId(props) {
  const id = props?.user?.id || props?.userId || props?.member?.user?.id
  if (id && typeof id === 'string') return id
  const direct = props?.channel?.getRecipientId?.()
  if (typeof direct === 'string' && direct) return direct
  const recipients = props?.channel?.recipients || props?.channel?.recipientIds
  if (Array.isArray(recipients) && recipients.length === 1)
    return typeof recipients[0] === 'string' ? recipients[0] : recipients[0]?.id
  return undefined
}
function nameHints(id, props) {
  const user = store('UserStore')?.getUser?.(id)
  return new Set([
    user?.username, user?.globalName, user?.displayName,
    props?.channel?.name, props?.user?.username, props?.user?.globalName,
  ].filter(s => typeof s === 'string' && s.length > 0).map(s => s.toLowerCase()))
}
function insertByName(root, id, props, compact = false) {
  if (!id || !hasElement(root) || markerExists(root)) return root
  const hints = nameHints(id, props)
  const passes = [
    // Main-tabs v2 DM entries render a UsernameWithEffects node that owns
    // userId + userName, not necessarily a plain Text child.
    n => n.props?.userId === id && typeof n.props?.userName === 'string',
    n => typeof n?.props?.children === 'string' && hints.has(n.props.children.toLowerCase()),
    n => typeof n?.props?.children === 'string' &&
      /semibold|bold|title/i.test(String(n?.props?.variant || '')),
    n => typeof n?.props?.children === 'string' &&
      (n.props.ellipsizeMode != null || n.props.numberOfLines === 1),
  ]
  for (const isName of passes) {
    let matched = false
    const updated = replaceFirst(root, n => !matched && isName(n), n => {
      matched = true
      return rowWithBadge(n, id, compact)
    })
    if (matched) return updated
  }
  if (hasElement(root.props?.label))
    return React.cloneElement(root, { label: rowWithBadge(root.props.label, id, compact) })
  return root
}
function injectMember(root, props) {
  if (!setting('members') && !setting('friends')) return root
  const id = getId(props)
  if (!id || !hasElement(root) || markerExists(root)) return root
  if (root.props?.label != null)
    return React.cloneElement(root, { label: rowWithBadge(root.props.label, id, true) })
  return insertByName(root, id, props, true)
}
function injectDm(root, props) {
  if (!setting('dmList')) return root
  const id = getId(props)
  return insertByName(root, id, props, true)
}
// PrivateChannelHeader receives a CHANNEL ID, not a user object. In v0.3.0
// getId(props) could never resolve that ID for direct message headers.
function getDmRecipient(channelId) {
  try {
    const channel = store('ChannelStore')?.getChannel?.(channelId)
    if (!channel || channel?.isMultiUserDM?.() || channel?.isGroupDM?.()) return
    const direct = channel?.getRecipientId?.()
    if (typeof direct === 'string' && direct) return direct
    const recipients = channel?.recipients
    if (Array.isArray(recipients) && recipients.length === 1)
      return typeof recipients[0] === 'string' ? recipients[0] : recipients[0]?.id
  } catch {}
}
function getSelectedDm() {
  try { return getDmRecipient(store('SelectedChannelStore')?.getChannelId?.()) }
  catch { return undefined }
}
function injectDmHeader(root, props) {
  if (!setting('dmHeader') || !hasElement(root) || markerExists(root)) return root
  const id = getDmRecipient(props?.channelId) || getId(props) || getSelectedDm()
  if (!id) return root
  // In current Discord Mobile renderChannelTitle produces a React node with
  // accessibleTitle, userId, and guildId. Wrap THAT node, not the avatar nor
  // the subtitle. Preserve the existing clickable title and accessibility.
  let inserted = false
  const updated = replaceFirst(root,
    e => !inserted && e?.props?.userId === id &&
      typeof e?.props?.accessibleTitle === 'string',
    e => { inserted = true; return rowWithBadge(e, id, false) })
  if (inserted) return updated
  // Alternate builds expose accessibleTitle without userId.
  const fallback = replaceFirst(root,
    e => !inserted && typeof e?.props?.accessibleTitle === 'string' &&
      (e.props?.guildId == null),
    e => { inserted = true; return rowWithBadge(e, id, false) })
  if (inserted) return fallback
  // Last resort: match a display-name node by its known userId / text.
  return insertByName(root, id, props, false)
}
function injectMessageHeader(root, props) {
  if (!setting('messageHeaders')) return root
  const id = props?.message?.author?.id
  if (!id) return root
  return insertByName(root, id, { ...props, user: props?.message?.author }, true)
}
// Transport only to the on-device timestamp TextView. All six palette values and
// their device order are shared with TimestampIcons.kt. No message content changes.
const TIMESTAMP_PREFIX = '\u2063\u2062\u2063'
const TIMESTAMP_MARK = /\u2063\u2062\u2063[\uFE00-\uFE05]{5}\u2063/g
const STATUS_TINT = { online: 2, idle: 3, dnd: 4, offline: 5, invisible: 5 }
let nativeTimestampReady = false

function prepareNativeTimestamps(logger) {
  if (valenced.react?.ReactNative?.Platform?.OS !== 'android') return false
  try {
    const icons = DEVICES.map(([key]) => ICON_URIS[key === 'embedded' ? 'console' : key])
    return valenced.modules.native.callNativeMethodSync(
      'mydiscordstuff.platform-indicators.configureTimestamps', icons,
    ) === true
  } catch (error) {
    logger?.warn?.('Android timestamp icons unavailable', error)
    return false
  }
}

function patchNativeChatMessage(row, input) {
  const message = input?.message
  const target = row?.message
  if (!target || typeof target.timestamp !== 'string' || !target.timestamp) return row
  const clean = target.timestamp.replace(TIMESTAMP_MARK, '')
  let timestamp = clean
  const normal = message?.type == null || [0, 19, 'DEFAULT', 'REPLY'].includes(message.type)
  if (nativeTimestampReady && setting('nativeMessageSymbols') && normal &&
      message?.author?.id && !message.author.bot && !message.author.system) {
    const current = statusMap(message.author.id)
    const colors = DEVICES.map(([key]) => {
      const status = current[key]
      if (typeof status !== 'string' || !status) return 0
      if (!setting('showOffline') && (status === 'offline' || status === 'invisible')) return 0
      return setting('crimson') ? 1 : (STATUS_TINT[status] || 1)
    })
    if (colors.some(Boolean))
      timestamp += TIMESTAMP_PREFIX + colors.map(c => String.fromCharCode(0xFE00 + c)).join('') + '\u2063'
  }
  if (timestamp === target.timestamp) return row
  return { ...row, message: { ...target, timestamp } }
}

// Create the filter only at START (Discord + Valenced's module runtime is ready).
// The old release evaluated createFilterGenerator during PREINIT, too early.
let memoNamed
let patched = new WeakSet()
function patchComponent(target, apply, cleanup, logger) {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return
  if (patched.has(target)) return
  const key = typeof target.type === 'function' ? 'type' :
    typeof target.render === 'function' ? 'render' :
    typeof target.default === 'function' ? 'default' : null
  if (!key) return
  try {
    let currentProps
    const removeBefore = before(target, key, args => {
      currentProps = args?.[0]
      return args
    })
    const removeAfter = after(target, key, tree => {
      const props = currentProps
      currentProps = undefined
      try { return apply(tree, props) }
      catch (e) {
        logger?.warn?.(`${MARKER} UI patch skipped`, e)
        return tree
      }
    })
    cleanup(removeBefore, removeAfter)
    patched.add(target)
  } catch (e) { logger?.warn?.(`${MARKER} component hook failed`, e) }
}
function attachNativeChatRows(target, cleanup, logger) {
  if (!target || typeof target.generateMessageRowData !== 'function' || patched.has(target)) return
  try {
    // before/after handlers, not an instead hook: composes with other plugins.
    let pendingInput
    const undoBefore = before(target, 'generateMessageRowData', args => {
      pendingInput = args?.[0]
      return args
    })
    const undoAfter = after(target, 'generateMessageRowData', row => {
      const input = pendingInput
      pendingInput = undefined
      try { return patchNativeChatMessage(row, input) }
      catch (e) {
        logger?.warn?.(`${MARKER} native chat patch skipped`, e)
        return row
      }
    })
    cleanup(undoBefore, undoAfter)
    patched.add(target)
  } catch (e) { logger?.warn?.(`${MARKER} native message hook failed`, e) }
}
function hookByPath(path, apply, cleanup, logger) {
  try {
    const unsubscribe = getModuleWithImportedPath(path, ns => {
      // Paths give us the actual module, regardless of minified React function names.
      // Modules may export a memo object ({type}) or plain function ({default}).
      const component = ns?.default ?? ns
      patchComponent(component, apply, cleanup, logger)
    })
    if (typeof unsubscribe === 'function') cleanup(unsubscribe)
  } catch (e) { logger?.warn?.(`${MARKER} missing ${path}`, e) }
}
function addHooks(cleanup, logger) {
  // Deferred until start(), after the module registries exist.
  memoNamed = createFilterGenerator(
    ([name], _, exp) => typeof exp?.type === 'function' && exp.type.name === name,
    ([name]) => `${MARKER}.memo(${name})`,
  )
  const track = fn => { if (typeof fn === 'function') cleanup(fn) }
  function hook(name, apply, max = 12) {
    try {
      track(getModules(memoNamed(name), component => {
        patchComponent(component, apply, cleanup, logger)
      }, { max }))
    } catch (e) { logger?.warn?.(`${MARKER} missing memo ${name}`, e) }
    try {
      track(getModules(withName(name), ns => {
        patchComponent(ns, apply, cleanup, logger)
      }, { max, returnNamespace: true }))
    } catch (e) { logger?.warn?.(`${MARKER} missing named ${name}`, e) }
  }
  // Existing stable hooks: server / group members and React profile badges.
  hook('UserRow', injectMember, 30)
  hook('GuildMemberRow', injectMember, 12)
  try {
    track(getModules(withProps('GuildMemberRow'), ns => {
      patchComponent(ns?.GuildMemberRow, injectMember, cleanup, logger)
    }, { max: 10 }))
  } catch {}

  // New, explicit module paths for current Discord Mobile DM list. The old
  // function-name-only patch misses memoized/minified MessagesItemChannelContent.
  hookByPath('modules/main_tabs_v2/native/tabs/messages/items/channel/MessagesItemChannelContent.tsx',
    injectDm, cleanup, logger)
  // Secondary fallbacks for alternate Discord UI builds.
  for (const name of ['MessagesItemChannelContent', 'MessagesItemChannelLegend', 'PrivateChannelItem'])
    hook(name, injectDm, 12)

  // DM title bar is its own module, not the whole ChannelHeader tree.
  hookByPath('modules/main_tabs_v2/native/channel/header/PrivateChannelHeader.tsx',
    injectDmHeader, cleanup, logger)
  for (const name of ['PrivateChannelHeader', 'PrivateChannelTitle'])
    hook(name, injectDmHeader, 8)

  // Other React-rendered author rows: leave the native-rendered chat to the
  // message-row generator below.
  for (const name of ['MessageHeader', 'MessageAuthor'])
    hook(name, injectMessageHeader, 8)

  // Actual native chat rows: generated data, NOT React views. Use the same
  // generateMessageRowData entrypoint used in public message row plugins.
  try {
    track(getModules(withProps('generateMessageRowData'), ns => {
      attachNativeChatRows(ns, cleanup, logger)
    }, { returnNamespace: true, max: 4 }))
  } catch (e) { logger?.warn?.(`${MARKER} row generator lookup failed`, e) }
  try {
    track(getModuleWithImportedPath('modules/messages/native/renderer/MessageWithContent.tsx', ns => {
      attachNativeChatRows(ns, cleanup, logger)
    }))
  } catch (e) { logger?.warn?.(`${MARKER} row path lookup failed`, e) }

  // Profile patch that already works in v0.2.1; don't change its logic.
  try {
    track(getModuleWithImportedPath(
      'modules/user_profile/native/UserProfilePrimaryInfo.tsx',
      ns => {
        const DisplayName = ns?.DisplayName
        if (typeof DisplayName !== 'function' || typeof ns?.default !== 'function') return
        function WrappedDisplayName(props) {
          const element = React.createElement(DisplayName, props)
          return setting('profiles') && props?.user?.id
            ? rowWithBadge(element, props.user.id, false)
            : element
        }
        try {
          track(after(ns, 'default', tree => {
            if (!setting('profiles') || markerExists(tree)) return tree
            return replaceFirst(tree,
              e => e.type === DisplayName,
              e => React.createElement(WrappedDisplayName, { ...e.props, key: e.key }),
            )
          }))
        } catch (err) { logger?.warn?.('Profile patch failed', err) }
      },
    ))
  } catch (e) { logger?.warn?.('Profile finder failed', e) }
}

function SettingsComponent({ api }) {
  const s = { ...DEFAULTS, ...(api.jsonStorage.use() || {}) }
  const rows = [
    ['dmList','Direct message list'],
    ['members','Server and group member lists'],
    ['friends','Friend lists'],
    ['profiles','Profile names'],
    ['dmHeader','Direct message header'],
    ['messageHeaders','React message author names'],
    ['nativeMessageSymbols','Platform icons next to message timestamps (Android)'],
    ['crimson','Use crimson icons (matches AMOLED theme)'],
    ['showOffline','Show offline statuses if available'],
  ]
  return React.createElement(Design.TableRowGroup, { title: 'Platform Indicators v0.3.2' },
    ...rows.map(([key,label]) => React.createElement(Design.TableSwitchRow, {
      key, label, value: Boolean(s[key]),
      onValueChange: value => api.jsonStorage.set({ [key]: value }),
    })))
}

return plugin({
  jsonStorage: { load: true, default: DEFAULTS },
  start({ cleanup, jsonStorage, logger, plugin: currentPlugin }) {
    storageApi = jsonStorage
    pluginRef = currentPlugin
    // Without this reset, disabling and re-enabling inside one session could
    // make every UI hook silently disappear because patched targets stayed in the WeakSet.
    patched = new WeakSet()
    try {
      initializeRuntime() // Never resolve React, patcher or Discord modules during preInit.
      nativeTimestampReady = prepareNativeTimestamps(logger)
      addHooks(cleanup, logger)
      if (currentPlugin?.startedLate) currentPlugin.requireReload()
      logger?.log?.('Platform Indicators v0.3.2 started')
    } catch (error) {
      // A start exception would make Valenced automatically DISABLE the plugin.
      // Report it instead so the error remains visible in plugin details.
      logger?.error?.('Platform Indicators startup error', error)
      currentPlugin?.reportError?.(error)
    }
  },
  stop() {
    nativeTimestampReady = false
    storageApi = undefined
    pluginRef?.requireReload?.()
    pluginRef = undefined
    patched = new WeakSet()
  },
  SettingsComponent,
})

})()})
