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
  const raw = { BRAND_500: "#4050bb", RED_300: "#ee884490", PRIMARY_800: "#101216", NEUTRAL_5: "#eaeaf0", BLACK: "#000000" };
  Object.defineProperty(raw, "GREEN_500", { value: "#008844", configurable: false, enumerable: true });
  const internal = { resolveSemanticColor: (_, token) => token === "OVERLAY_SCRIM" ? "#345678aa" :
    token === "ICON_DISABLED_ALPHA" ? "rgba(23,45,67,0.5)" : "#abcdef", getSemanticColorName: token => token };
  const original = props => props;
  const mod = { RootThemeContextProvider: original, DisableCustomTheme: {} };
  const inputs = Object.freeze({ enabledExperiments: Object.freeze(["existing"]), children: "messages" });
  const storage = { cache: { speed: "normal", effect: "rainbow", background: "#ab3212", buttons: "#df12ef", text: "#ffff66",
      backgroundAnimated: true, buttonsAnimated: false, textAnimated: false }, loaded: true, use() { return this.cache; },
    subscribe(fn) { storageUpdates.add(fn); return () => storageUpdates.delete(fn); },
    set(value) { writes++; Object.assign(this.cache, value); for (const fn of storageUpdates) fn(); } };
  function listen(name, cb) {
    events.set(name, cb);
    return { remove: () => events.delete(name) };
  }
  let hooks, hookIndex;
  function render(component, props, state = []) {
    hooks = state; hookIndex = 0;
    return component(props);
  }
  function flatten(node) {
    return !node || typeof node !== "object" ? [] : [node, ...node.children.flatMap(flatten)];
  }
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const React = {
    useState(initial) {
      const active = hooks, index = hookIndex++;
      if (!(index in active)) active[index] = initial;
      return [active[index], next => { active[index] = next; }];
    },
    useEffect() {},
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
      cb(props[0] === "RawColor" ? { RawColor: raw, default: { internal } } : mod);
      return () => {};
    } } },
    patcher: { instead(obj, key, hook) {
      const next = obj[key]; obj[key] = (...args) => hook(args, next); return () => { obj[key] = next; };
    } },
    react: { React, ReactNative: { View: "View", Text: "Text", Pressable: "Pressable", Switch: "Switch", TextInput: "TextInput", AppState: { currentState: "active", addEventListener: listen },
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
  const initialRenders = renders;
  for (let i = 0; i < 120; i++) {
    step();
    const text = color("TEXT_NORMAL"), fill = color("CONTROL_PRIMARY_BACKGROUND_DEFAULT");
    distinct.add(text);
    assert.equal(color("CHAT_BACKGROUND"), "#000000");
    assert.ok((luminance(text) + 0.05) / 0.05 >= 4.5);
    assert.ok((luminance(color("TEXT_MUTED")) + 0.05) / 0.05 >= 4.5);
    assert.ok((luminance(color("CONTROL_PRIMARY_TEXT_DEFAULT")) + 0.05) / (luminance(fill) + 0.05) >= 4.5);
  }
  assert.equal(renders - initialRenders, 120);
  assert.equal(distinct.size, 120);
  assert.equal(color("TEXT_NORMAL"), firstText);
  assert.equal(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), firstFill);
  assert.equal(lastProps.enabledExperiments.length, 2);
  assert.equal(inputs.enabledExperiments.length, 1);
  assert.equal(lastProps.children, inputs.children);
  assert.equal(color("TEXT_DANGER"), firstText);
  assert.equal(color("TEXT_NORMAL", { isProfileTheme: true }), firstText);
  assert.equal(color("PROFILE_BACKGROUND", { isProfileTheme: true }), "#000000");
  assert.equal(color("OVERLAY_SCRIM"), "#000000aa");
  assert.match(color("ICON_DISABLED_ALPHA"), /80$/);
  assert.equal(raw.PRIMARY_800, "#000000");
  assert.equal(raw.GREEN_500, "#008844");
  assert.equal(color("MOBILE_CHANNEL_ITEM_BACKGROUND_ACTIVE"), "#000000");
  assert.equal(writes, 0);

  const rootState = [];
  const screen = () => render(plugin.SettingsComponent, { api }, rootState);
  async function choose(group, title) {
    const picker = flatten(screen()).find(n => n.type === "Pressable" &&
      n.children.some(c => c?.children?.includes(group)));
    picker.props.onPress();
    const option = flatten(screen()).find(n => n.props?.title === title);
    assert.ok(option, title);
    option.props.onPress(); await flush();
  }
  const toggle = (label, value) => flatten(screen()).find(n => n.props?.accessibilityLabel === label).props.onValueChange(value);
  const pause = value => toggle("Pausar animação", value);
  const editors = () => flatten(screen()).filter(n => n.props?.area).length;
  assert.equal(editors(), 0);
  await choose("Duração do ciclo", "15 s");
  step(7500);
  const midpoint = color("TEXT_NORMAL");
  assert.notEqual(midpoint, firstText);
  assert.notEqual(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), firstFill);
  pause(true); await flush();
  step(90000);
  assert.equal(clock.size, 0);
  assert.equal(color("TEXT_NORMAL"), midpoint);
  pause(false); await flush();
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
  for (const seconds of [5, 10, 15, 20, 30, 45, 60, 90, 120]) {
    await choose("Duração do ciclo", seconds + " s");
    const before = color("TEXT_NORMAL");
    step(seconds * 500);
    assert.notEqual(color("TEXT_NORMAL"), before);
    step(seconds * 500);
    assert.equal(color("TEXT_NORMAL"), before);
  }
  const halfCycles = new Set();
  for (const effect of ["Arco-íris suave", "Chroma pulsante", "Onda de cores", "Pulso RGB"]) {
    await choose("Efeito", effect);
    const tokens = ["TEXT_NORMAL", "CONTROL_PRIMARY_BACKGROUND_DEFAULT", "REDESIGN_BUTTON_SECONDARY_BACKGROUND",
      "STATUS_DND", "VOICE_SPEAKING", "TEXT_DANGER", "NEW_CHANNEL_ICON", "USER_PROFILE_BORDER", "BADGE_BACKGROUND",
      "TEXT_LINK", "BUTTON_DANGER_TEXT", "NEW_CONTROL_ICON", "BORDER_STRONG"];
    const before = tokens.map(n => color(n));
    const rawBefore = [raw.BRAND_500, raw.RED_300, raw.NEUTRAL_5];
    step(60000);
    tokens.forEach((n, i) => assert.notEqual(color(n), before[i], effect + ": " + n));
    [raw.BRAND_500, raw.RED_300, raw.NEUTRAL_5].forEach((v, i) => assert.notEqual(v, rawBefore[i]));
    assert.match(raw.RED_300, /90$/);
    for (const n of ["CHAT_BACKGROUND", "NEW_DIALOG_BACKGROUND", "PANEL_BG", "BACKGROUND_MESSAGE_HOVER"])
      assert.equal(color(n), "#000000", effect + ": " + n);
    halfCycles.add(color("TEXT_NORMAL"));
    step(60000);
  }
  assert.equal(halfCycles.size, 4);
  // Legacy fixed mode hydrates to RGB off without overwriting any saved colors.
  storage.set({ effect: "fixed" });
  assert.equal(editors(), 3);
  assert.equal(color("CHAT_BACKGROUND"), "#ab3212");
  assert.equal(raw.BRAND_500, "#4050bb");
  assert.equal(clock.size, 0);
  function editor(key) {
    const state = [];
    const draw = () => {
      const element = flatten(screen()).find(n => n.props?.area?.key === key);
      return render(element.type, element.props, state);
    };
    flatten(draw()).find(n => n.type === "Pressable").props.onPress();
    return draw;
  }
  async function setHex(key, digits) {
    const draw = editor(key);
    const input = () => flatten(draw()).find(n => n.type === "TextInput").props;
    input().onChangeText(digits);
    input().onSubmitEditing(); await flush();
  }
  await setHex("background", "#123");
  await setHex("buttons", "ffee22");
  await setHex("text", "#ffffff");
  assert.equal(color("CHAT_BACKGROUND"), "#112233");
  assert.equal(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), "#ffee22");
  assert.equal(color("TEXT_NORMAL"), "#ffffff");
  assert.equal(color("CONTROL_PRIMARY_TEXT_DEFAULT"), "#000000");
  await setHex("background", "#oops");
  assert.equal(color("CHAT_BACKGROUND"), "#112233");
  toggle("Tema RGB", true); await flush();
  assert.equal(editors(), 0);
  assert.equal(clock.size, 1);
  assert.equal(color("CHAT_BACKGROUND"), "#000000");
  assert.notEqual(color("TEXT_NORMAL"), "#ffffff");
  assert.notEqual(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), "#ffee22");
  raw.BRAND_500 = "#236f6f"; // Another theme updated its underlying color.
  pause(true); await flush();
  assert.equal(editors(), 0);
  toggle("Tema RGB", false); await flush();
  assert.equal(raw.BRAND_500, "#236f6f");
  assert.equal(clock.size, 0);
  assert.equal(editors(), 3);
  assert.equal(color("CHAT_BACKGROUND"), "#112233");
  assert.equal(color("CONTROL_PRIMARY_BACKGROUND_DEFAULT"), "#ffee22");
  assert.equal(color("TEXT_NORMAL"), "#ffffff");
  toggle("Tema RGB", true); await flush();
  assert.equal(clock.size, 1);
  for (const remove of cleanup.reverse()) remove();
  assert.equal(mod.RootThemeContextProvider, original);
  assert.equal(lastProps.enabledExperiments, inputs.enabledExperiments);
  assert.equal(color("CHAT_BACKGROUND"), "#abcdef");
  for (const resource of [events, storageUpdates, clock]) assert.equal(resource.size, 0);
  assert.equal(Object.getOwnPropertyDescriptor(raw, "BRAND_500").value, "#236f6f");
  unsubscribe();
});
