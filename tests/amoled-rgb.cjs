const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const code = fs.readFileSync(path.join(__dirname, "../plugins/amoled-rgb/index.js"), "utf8");

function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(s => parseInt(s, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test("complete rainbow cycle, visible updates, settings, app state and unloading", async () => {
  const clock = new Map(), events = new Map(), cleanup = [], storageUpdates = new Set();
  let now = 0, renders = 0, writes = 0, reload = 0, unsubscribe, lastProps;
  const internal = { resolveSemanticColor: () => "#abcdef", getSemanticColorName: token => token };
  const original = props => props;
  const mod = { RootThemeContextProvider: original, DisableCustomTheme: {} };
  const inputs = Object.freeze({ enabledExperiments: Object.freeze(["existing"]), children: "messages" });
  const storage = { cache: { speed: "normal" }, loaded: true, use() { return this.cache; },
    subscribe(fn) { storageUpdates.add(fn); return () => storageUpdates.delete(fn); },
    set(value) { writes++; Object.assign(this.cache, value); for (const fn of storageUpdates) fn(); } };
  function listen(name, cb) {
    events.set(name, cb);
    return { remove: () => events.delete(name) };
  }
  const React = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useMemo: fn => fn(),
    useSyncExternalStore(subscribe, get) {
      if (!unsubscribe) unsubscribe = subscribe(() => { renders++; lastProps = mounted(inputs).props; });
      return get();
    },
  };
  const api = { jsonStorage: storage, cleanup: fn => cleanup.push(fn), logger: console,
    plugin: { startedLate: true, requireReload() { reload++; } } };
  const runtime = {
    modules: { finders: { filters: { withProps: (...props) => props }, getModules(props, cb) {
      cb(props[0] === "RawColor" ? { default: { internal } } : mod);
      return () => {};
    } } },
    patcher: { instead(obj, key, hook) {
      const next = obj[key]; obj[key] = (...args) => hook(args, next); return () => { obj[key] = next; };
    } },
    react: { React, ReactNative: { AppState: { currentState: "active", addEventListener: listen },
      AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: listen } } },
    discord: { design: { Design: { TableRow: "row", TableRowGroup: "group", TableSwitchRow: "switch" } } },
  };
  const plugin = vm.runInNewContext(code, { valenced: runtime, plugin: p => p, Date: { now: () => now },
    setInterval(fn, ms) { assert.equal(ms, 250); clock.set(1, fn); return 1; },
    clearInterval: id => clock.delete(id) }).default;
  plugin.preInit(api);
  const mounted = mod.RootThemeContextProvider;
  lastProps = mounted(inputs).props;
  plugin.start(api);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(reload, 1);
  assert.equal(clock.size, 1);
  const color = (name, context) => internal.resolveSemanticColor("dark", name, context);
  const firstText = color("TEXT_NORMAL"), firstFill = color("CONTROL_PRIMARY_BACKGROUND_DEFAULT");
  const distinct = new Set();
  function step(ms = 250) { now += ms; for (const fn of clock.values()) fn(); }
  for (let i = 0; i < 120; i++) {
    step();
    const text = color("TEXT_NORMAL"), fill = color("CONTROL_PRIMARY_BACKGROUND_DEFAULT");
    distinct.add(text);
    assert.equal(color("CHAT_BACKGROUND"), "#000000");
    assert.ok((luminance(text) + 0.05) / 0.05 >= 4.5);
    assert.ok((luminance(color("TEXT_MUTED")) + 0.05) / 0.05 >= 4.5);
    assert.ok((luminance(color("CONTROL_PRIMARY_TEXT_DEFAULT")) + 0.05) / (luminance(fill) + 0.05) >= 4.5);
  }
  assert.equal(renders, 120);
  assert.equal(distinct.size, 120);
  assert.equal(color("TEXT_NORMAL"), firstText);
  assert.equal(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), firstFill);
  assert.equal(lastProps.enabledExperiments.length, 2);
  assert.equal(inputs.enabledExperiments.length, 1);
  assert.equal(lastProps.children, inputs.children);
  assert.equal(color("TEXT_DANGER"), "#abcdef");
  assert.equal(color("TEXT_NORMAL", { isProfileTheme: true }), "#abcdef");
  assert.equal(writes, 0);

  const controls = plugin.SettingsComponent({ api }).children;
  controls[2].props.onPress();
  step(7500);
  const midpoint = color("TEXT_NORMAL");
  assert.notEqual(midpoint, firstText);
  assert.notEqual(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), firstFill);
  controls[3].props.onValueChange(true);
  step(90000);
  assert.equal(clock.size, 0);
  assert.equal(color("TEXT_NORMAL"), midpoint);
  controls[3].props.onValueChange(false);
  events.get("change")("background");
  step(60000);
  assert.equal(clock.size, 0);
  events.get("change")("active");
  events.get("reduceMotionChanged")(true);
  assert.equal(clock.size, 0);
  events.get("reduceMotionChanged")(false);
  step(7500);
  assert.equal(color("TEXT_NORMAL"), firstText);
  assert.equal(writes, 3);
  for (const remove of cleanup.reverse()) remove();
  assert.equal(mod.RootThemeContextProvider, original);
  assert.equal(lastProps.enabledExperiments, inputs.enabledExperiments);
  assert.equal(color("CHAT_BACKGROUND"), "#abcdef");
  for (const resource of [events, storageUpdates, clock]) assert.equal(resource.size, 0);
  unsubscribe();
});
