const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const bundle = fs.readFileSync(path.join(__dirname, "../../index.js"), "utf8");
const me = "100000000000000001", who = "200000000000000002", other = "300000000000000003";
const turn = () => new Promise(resolve => setImmediate(resolve));

async function host(options = {}) {
  let owner = me, data = options.data || { accounts: {} }, route = null, section = null, blocked = false;
  const errors = [], notifications = [], hooks = new Map(), cleanup = [];
  const slots = [], effects = [], disposers = [];
  let slot = 0;
  const R = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) {
      const i = slot++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], v => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }];
    },
    useRef(initial) { return R.useState({ current: initial })[0]; },
    useReducer(fn, initial) { const [v, set] = R.useState(initial); return [v, a => set(x => fn(x, a))]; },
    useEffect(fn, deps) { const i = slot++; if (!slots[i]) { slots[i] = deps; effects.push(fn); } },
  };
  const native = { TextInput: "input", View: "view", ScrollView: "scroll", Keyboard: { dismiss() {} },
    AppState: { addEventListener() { return { remove() {} }; } }, Platform: { OS: "android", Version: options.version || 33 },
    PermissionsAndroid: { check: async () => options.granted !== false, request: async () => { options.requests = (options.requests || 0) + 1; } },
    NativeModules: options.modules || {} };
  const channel = { id: "dm", type: 1 };
  const stores = {
    UserStore: { getCurrentUser: () => ({ id: owner }), getUser: id => ({ id, username: "Amigo" }) },
    PresenceStore: { getStatus: () => "offline", getActivities: () => [] },
    ChannelStore: { getChannel: id => id === "dm" ? channel : { id, type: 0, name: "restrito" } },
    PermissionStore: { can: () => false }, RelationshipStore: { isBlocked: () => blocked },
  };
  const env = {
    react: { React: R, ReactNative: native }, components: {},
    modules: { native: { callNativeMethodSync(method, args) {
      if (options.missing) throw Error("Native bridge method not registered: " + method);
      if (options.noContext) return "unavailable";
      if (options.channelBlocked) return "channel-blocked";
      if (method.endsWith(".notify")) { notifications.push(args); return "sent"; }
      return "ready";
    } } },
    discord: {
      common: { constants: { Constants: {} } },
      design: { Design: { TableRow: "row", TableSwitchRow: "switch", TableRowGroup: "group", Text: "text" } },
      flux: { Stores: stores, onFluxEventDispatched(type, fn) { hooks.set(type, fn); return () => hooks.delete(type); } },
      modules: { settings: { onSettingsModulesLoaded(f) { f(); return () => {}; },
        registerSettingsItem(key, item) { route = item; return () => { route = null; }; },
        addSettingsItemToSection(value) { section = value; return () => { section = null; }; }, refreshSettings() {} } },
    },
  };
  const plugin = vm.runInNewContext(bundle, { setTimeout, clearTimeout, valenced: env, plugin: x => x }).default;
  plugin.start({ jsonStorage: { get: async () => data, set: async x => { data = x; } },
    logger: { warn: (...args) => errors.push(args), error: (...args) => errors.push(args) }, cleanup: f => cleanup.push(f) });
  await turn();
  function draw() {
    slot = 0;
    const root = route.screen.getComponent()();
    for (const run of effects.splice(0)) { const off = run(); if (off) disposers.push(off); }
    return root;
  }
  function field(match) {
    const visit = node => {
      if (!node || typeof node !== "object") return null;
      if (match(node)) return node;
      for (const child of node.children) { const hit = visit(child); if (hit) return hit; }
    };
    const value = visit(draw());
    assert.ok(value, "campo esperado na tela UserRadar");
    return value.props;
  }
  function add(id) {
    field(n => n.props.placeholder === "ID do usuário do Discord").onChangeText(id);
    field(n => n.props.label === "Adicionar à lista").onPress();
  }
  function send(e) { assert.strictEqual(hooks.get(e.type)(e), e); }
  function message(id, ch = "dm", uid = who) {
    send({ type: "MESSAGE_CREATE", message: { id, channel_id: ch, type: 0, content: "privado", author: { id: uid } } });
  }
  function toggle(text, value) { field(n => n.props.label === text).onValueChange(value); }
  async function stop() {
    disposers.splice(0).forEach(f => f());
    cleanup.reverse().forEach(f => f()); await turn();
    assert.equal(route, null); assert.equal(section, null); assert.equal(hooks.size, 0);
    assert.deepEqual(errors, []);
  }
  return { notifications, field, add, send, message, toggle, stop,
    account: id => { owner = id; }, block: flag => { blocked = flag; }, section: () => section, data: () => data };
}

test("Valenced route adds one user by ID, tests Android and passes Discord events through", async () => {
  const h = await host();
  assert.equal(h.section(), "VALENCED"); h.add("123"); h.add(who); h.add(who);
  await h.field(n => n.props.label === "Enviar notificação de teste").onPress();
  assert.equal(h.notifications[0][2], "test");
  h.message("a"); h.message("a"); h.message("hidden", "guild"); h.message("unknown", "dm", other);
  h.block(true); h.message("blocked"); h.block(false);
  assert.equal(h.notifications.length, 2); assert.equal(h.notifications[1][2], who);
  await h.stop();
  assert.equal(h.data().accounts[me].users.length, 1);
  assert.equal(h.data().accounts[me].log.length, 1);
  assert.ok(!JSON.stringify(h.data()).includes("privado"));
});

test("presence changes, quiet hours, global and individual preferences", async () => {
  const h = await host(); h.add(who);
  const pres = status => h.send({ type: "PRESENCE_UPDATES", updates: [{ user: { id: who }, status }] });
  pres("offline"); pres("online"); pres("online");
  assert.equal(h.notifications.length, 1);
  h.toggle("Receber notificações no celular", false); pres("idle"); h.toggle("Receber notificações no celular", true);
  h.toggle("Silenciar durante um período", true);
  h.field(n => n.props.title === "Início").apply("00:00"); h.field(n => n.props.title === "Fim").apply("00:00");
  pres("dnd"); h.toggle("Silenciar durante um período", false);
  h.field(n => n.props.label === "Configurar pessoa").onPress(); h.toggle("Silenciar notificações dessa pessoa", true);
  pres("offline"); assert.equal(h.notifications.length, 1);
  h.toggle("Novas mensagens", false); h.message("ignore");
  await h.stop(); assert.equal(h.data().accounts[me].log.length, 4);
});

test("reconnect baselines, separate accounts, bounded history and cleanup", async () => {
  const h = await host(); h.add(who);
  h.send({ type: "CONNECTION_CLOSED" }); h.message("missed");
  h.send({ type: "CONNECTION_OPEN" }); h.message("startup");
  await new Promise(resolve => setTimeout(resolve, 5));
  h.message("fresh"); h.account(other); h.message("other"); h.account(me);
  for (let i = 0; i < 131; i++) h.message("msg" + i);
  assert.equal(h.notifications.length, 132);
  await h.stop();
  assert.equal(h.data().accounts[me].log.length, 120); assert.equal(h.data().accounts[other], undefined);
});

test("optional typing, edit, deletion and activity alerts retain no message text", async () => {
  const h = await host(); h.add(who);
  for (const key of ["Digitação","Mensagens editadas","Mensagens apagadas","Jogos, música e transmissões"]) h.toggle(key, true);
  h.message("1");
  h.send({ type: "MESSAGE_UPDATE", message: { id: "1", channel_id: "dm", edited_timestamp: "t", content: "segredo" } });
  h.send({ type: "MESSAGE_DELETE", id: "1", channelId: "dm" });
  h.send({ type: "TYPING_START", channelId: "dm", userId: who }); h.send({ type: "TYPING_START", channelId: "dm", userId: who });
  h.send({ type: "PRESENCE_UPDATES", updates: [{ user: { id: who }, activities: [{ type: 2, name: "Spotify", details: "Faixa", state: "Artista" }] }] });
  assert.equal(h.notifications.length, 5);
  await h.stop();
  assert.ok(!JSON.stringify(h.data()).includes("segredo"));
});

test("a new JS session retains the watchlist and posts tests and activity with the Discord Android module", async () => {
  const first = await host();
  first.add(who); await first.stop();
  const posts = [], options = { data: first.data(), missing: true, modules: {
    PushNotificationAndroid: { presentLocalNotification: payload => posts.push(payload) },
  } };
  const next = await host(options);
  const button = () => next.field(n => n.props.label === "Enviar notificação de teste");
  await button().onPress();
  assert.match(button().subLabel, /encaminhado ao Discord/);
  next.message("after-reload"); await turn();
  assert.equal(posts.length, 2); assert.equal(posts[0].alertTitle, "UserRadar");
  assert.match(posts[1].alertBody, /mensagem/); assert.equal(posts[1].category, "local");
  assert.equal(next.notifications.length, 0);
  options.missing = false; options.noContext = true;
  next.message("waiting-context"); await turn(); assert.equal(posts.length, 3);
  options.noContext = false;
  next.message("native-ready"); await turn();
  assert.equal(next.notifications.length, 1); assert.equal(posts.length, 3);
  await next.stop();
});

test("reload fallback respects app permissions, a muted channel and session lifetime", async () => {
  const posts = [], channels = [];
  const options = { missing: true, granted: false, modules: {
    PushNotificationAndroid: { presentLocalNotification: p => posts.push(p) },
    NativeNotifSettingsModule: { getAndroidNotifChannelStates: () => channels },
  } };
  const h = await host(options); h.add(who);
  const button = () => h.field(n => n.props.label === "Enviar notificação de teste");
  h.message("denied"); await turn(); assert.equal(options.requests, undefined);
  await button().onPress(); assert.equal(options.requests, 1);
  assert.match(button().subLabel, /bloqueou/);
  options.granted = true; channels.push({channelId:"mydiscordstuff.user-radar.activity.v1",importance:0});
  await button().onPress(); assert.match(button().subLabel, /desativado/);
  channels.length = 0; options.missing = false; options.channelBlocked = true;
  await button().onPress(); assert.equal(posts.length, 0);
  options.missing = true;
  h.message("stop-in-flight"); await h.stop(); assert.equal(posts.length, 0);
});
