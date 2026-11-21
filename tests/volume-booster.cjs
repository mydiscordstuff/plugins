const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.resolve(__dirname, "../plugins/volume-booster/index.js"), "utf8");

test("settings apply gain to one voice connection and restore on native adjustments, mute and teardown", () => {
  const me = "111111111111111111", her = "222222222222222222", friend = "333333333333333333";
  const user = { id: me };
  let channel = "call", base = 149, muted = false, cleanup, selected, timer, streamWrites = 0;
  const calls = [], events = new Map(), rows = [{ userId: me }, { userId: her }, { userId: friend }];
  const connection = { context: "default", setLocalVolume(id, gain) { calls.push([id, gain]); } };
  const stream = { context: "stream", setLocalVolume() { streamWrites++; } };
  let live = [connection, stream];
  const media = { getLocalVolume: () => base, isLocalMute: () => muted,
    getMediaEngine: () => ({ eachConnection: fn => live.forEach(fn) }) };
  const Stores = { UserStore: { getCurrentUser: () => user, getUser: id => ({ username: id === her ? "Amor" : "Amigo" }) },
    SelectedChannelStore: { getVoiceChannelId: () => channel },
    VoiceStateStore: { getVoiceStatesForChannel: () => rows }, MediaEngineStore: media };
  const flux = { Stores, onFluxEventDispatched(type, fn) { events.set(type, fn); return () => events.delete(type); } };
  function dispatch(type, action = {}) {
    assert.equal(events.get(type)(action), action);
    if (timer) { const run = timer; timer = null; run(); }
  }
  const React = { createElement: (type, props, ...children) => ({ type, props, children }),
    useState: () => [selected, v => { selected = v; }], useEffect() {}, useSyncExternalStore: (_, get) => get() };
  const plugin = vm.runInNewContext(source, { plugin: p => p, valenced: { react: { React, ReactNative: { View: "view" } },
    discord: { flux, design: { Design: { TableRow: "row", TableRowGroup: "group" } } } },
    setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => { timer = null; } }).default;
  plugin.start({ cleanup: fn => { cleanup = fn; }, logger: console });
  function tree() { const screen = plugin.SettingsComponent(); return screen.type(screen.props); }
  function get(label) { return tree().children.filter(Boolean).flatMap(group => group.children).find(row => row.props.label === label)?.props; }
  const press = label => { const row = get(label); assert.ok(row, label); row.onPress(); };
  assert.equal(calls.length, 0);
  press("Amor"); press("250%");
  assert.deepEqual(calls.at(-1), [her, 250]);
  assert.equal(get("250%").subLabel, "250% solicitado");
  live = [];
  dispatch("RTC_CONNECTION_STATE");
  assert.match(get("250%").subLabel, /Aguardando/);
  live = [connection, stream];
  dispatch("RTC_CONNECTION_STATE");
  assert.deepEqual(calls.at(-1), [her, 250]);
  muted = true;
  dispatch("AUDIO_TOGGLE_LOCAL_MUTE");
  assert.deepEqual(calls.at(-1), [her, base]);
  muted = false;
  dispatch("AUDIO_TOGGLE_LOCAL_MUTE");
  assert.deepEqual(calls.at(-1), [her, 250]);
  base = 0; dispatch("RTC_CONNECTION_STATE");
  assert.deepEqual(calls.at(-1), [her, 0]);
  base = 149; press("300%");
  assert.deepEqual(calls.at(-1), [her, 300]);
  const before = calls.length;
  dispatch("AUDIO_SET_LOCAL_VOLUME", { userId: her, context: "default" });
  assert.equal(calls.length, before);
  assert.equal(get("300%").subLabel, undefined);
  press("400%"); press("Voltar ao volume do Discord");
  assert.deepEqual(calls.at(-1), [her, base]);
  press("225%"); channel = null; dispatch("VOICE_CHANNEL_SELECT");
  assert.deepEqual(calls.at(-1), [her, base]);
  channel = "new-call"; dispatch("VOICE_CHANNEL_SELECT");
  assert.equal(get("Amor").subLabel, "Volume do Discord");
  press("350%"); cleanup();
  assert.deepEqual(calls.at(-1), [her, base]);
  assert.ok(calls.every(([id]) => id === her));
  assert.equal(streamWrites, 0);
  assert.equal(events.size, 0);
  assert.equal(timer, null);
});
