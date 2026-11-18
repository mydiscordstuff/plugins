({ default: (function () {
  "use strict";
  const CATEGORIES = {
    status: "Presença", messages: "Novas mensagens", edits: "Mensagens editadas",
    deletes: "Mensagens apagadas", typing: "Digitação", voice: "Canais de voz",
    activity: "Jogos, música e transmissões", profile: "Alterações de perfil",
    shared: "Entradas e saídas em servidores",
  };
  const OPTIONS = {
    enabled: true, quiet: false, from: "23:00", until: "07:00",
    categories: { status: true, messages: true, edits: false, deletes: false,
      typing: false, voice: true, activity: false, profile: false, shared: false },
  };
  const STATUS = { online: "online", idle: "ausente", dnd: "não perturbe", offline: "offline" };
  const ID = /^[1-9]\d{16,19}$/;
  const CLOCK = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const SETTING = "MyDiscordStuffUserRadar";
  const MAX_LOG = 120;
  let active;
  let writes = Promise.resolve();

  function blank() { return { ...OPTIONS, categories: { ...OPTIONS.categories }, users: [], log: [] }; }
  function quietNow(p, date) {
    if (!p.quiet) return false;
    const hhmm = [date.getHours(), date.getMinutes()].map(n => String(n).padStart(2, "0")).join(":");
    return p.from < p.until ? hhmm >= p.from && hhmm < p.until : hhmm >= p.from || hhmm < p.until;
  }
  function bridge(method, args = []) {
    try { return valenced.modules.native.callNativeMethodSync("mydiscordstuff.user-radar." + method, args); }
    catch { return "unavailable"; }
  }

  function makeSession(storage, logger) {
    const { Stores } = valenced.discord.flux;
    let accounts = {}, loaded = false, account = null, suspended = false, dead = false;
    let saveTimer, bootTimer;
    const listeners = new Set(), snapshots = new Map(), recent = new Map();
    const messages = new Map();
    const cleanups = [];
    function redraw() { for (const fn of listeners) fn(); }
    function wipeTransient() { snapshots.clear(); recent.clear(); messages.clear(); }
    function syncAccount() {
      const id = Stores.UserStore?.getCurrentUser?.()?.id ?? null;
      if (id !== account) { account = id; wipeTransient(); redraw(); }
      return account;
    }
    function prefs() { return loaded && account ? accounts[account] ?? blank() : null; }
    function flush() {
      clearTimeout(saveTimer);
      saveTimer = null;
      if (!loaded) return;
      const data = { accounts };
      writes = writes.then(() => storage.set(data, true)).catch(e => logger?.warn?.("UserRadar: falha ao salvar", e));
    }
    function save(next, immediately = false) {
      if (!loaded || !account) return;
      accounts = { ...accounts, [account]: next };
      if (immediately) flush();
      else if (!saveTimer) saveTimer = setTimeout(flush, 400);
      redraw();
    }
    function update(fn) {
      syncAccount();
      const p = prefs();
      if (p) save(fn(p), true);
    }
    function person(id) {
      return prefs()?.users.find(u => u.id === id && !Stores.RelationshipStore?.isBlocked?.(id));
    }
    function display(id, p) {
      const u = Stores.UserStore?.getUser?.(id);
      return p?.name || u?.globalName || u?.global_name || u?.username || id;
    }
    function channel(id) {
      if (!id) return null;
      const ch = Stores.ChannelStore?.getChannel?.(id);
      if (!ch) return null;
      if (ch.isPrivate?.() || [1, 3].includes(ch.type)) return ch;
      const bit = valenced.discord.common.constants.Constants?.Permissions?.VIEW_CHANNEL ?? 1024n;
      return Stores.PermissionStore?.can?.(bit, ch) ? ch : null;
    }
    function location(ch) {
      return [1, 3].includes(ch.type) || ch.isPrivate?.() ? "na conversa privada" :
        ch.name ? "em #" + ch.name : "no canal";
    }
    function emit(id, category, body, key, ttl = 120000) {
      const p = prefs(), u = person(id);
      if (!u || !(u.overrides?.[category] ?? p.categories[category])) return;
      const now = Date.now(), token = id + "/" + category + "/" + key;
      if ((recent.get(token) ?? 0) > now) return;
      recent.delete(token);
      recent.set(token, now + ttl);
      if (recent.size > 1024) recent.delete(recent.keys().next().value);
      save({ ...p, log: [{ id, category, body, at: now }, ...p.log].slice(0, MAX_LOG) });
      if (p.enabled && !u.muted && !quietNow(p, new Date(now))) {
        bridge("notify", ["UserRadar · " + display(id, u), body, id]);
      }
    }
    function snapshot(id) {
      let s = snapshots.get(id);
      if (!s) { s = {}; snapshots.set(id, s); }
      return s;
    }
    function statusOf(v) { return v === "invisible" ? "offline" : Object.prototype.hasOwnProperty.call(STATUS, v) ? v : undefined; }
    function activityOf(list) {
      return list.filter(a => a && [0, 1, 2, 3, 5].includes(a.type) && a.name)
        .map(a => [a.type, a.name, a.type === 2 ? [a.details, a.state].filter(Boolean).join(" — ") : ""].join("|"))
        .sort();
    }
    function rememberProfile(s, user, notify) {
      if (!user) return;
      const fields = { username: ["username", "nome de usuário"], globalName: ["global_name", "nome de exibição"],
        avatar: ["avatar", "avatar"], banner: ["banner", "banner"], bio: ["bio", "biografia"], pronouns: ["pronouns", "pronomes"] };
      const changed = [];
      for (const [key, [alias, label]] of Object.entries(fields)) {
        const value = user[key] !== undefined ? user[key] : user[alias];
        if (value === undefined) continue;
        if (key in s && s[key] !== value) changed.push(label);
        s[key] = value;
      }
      if (notify && changed.length) emit(user.id, "profile", "Alterou " + changed.join(", ") + ".", changed.join(","), 1500);
    }
    function seed(id) {
      const s = snapshot(id), pres = Stores.PresenceStore;
      const status = statusOf(pres?.getStatus?.(id));
      if (status !== undefined) s.status = status;
      const acts = pres?.getActivities?.(id);
      if (Array.isArray(acts)) s.activities = activityOf(acts);
      rememberProfile(s, Stores.UserStore?.getUser?.(id), false);
    }
    function onPresence(u) {
      const id = u?.user?.id ?? u?.userId;
      if (!person(id)) return;
      if (!snapshots.has(id)) seed(id);
      const s = snapshot(id), next = statusOf(u.status);
      if (next !== undefined) {
        const old = s.status;
        s.status = next;
        if (old !== undefined && old !== next) emit(id, "status", "Agora está " + STATUS[next] + ".", old + "/" + next, 8000);
      }
      if (!Array.isArray(u.activities)) return;
      const list = activityOf(u.activities), prev = s.activities;
      s.activities = list;
      if (!prev || JSON.stringify(prev) === JSON.stringify(list)) return;
      const added = list.filter(a => !prev.includes(a));
      const removed = prev.filter(a => !list.includes(a));
      for (const entry of added.length ? added : removed) {
        const [type, name, track] = entry.split("|");
        const action = { 0: "Jogando", 1: "Transmitindo", 2: "Ouvindo", 3: "Assistindo", 5: "Competindo em" }[type];
        const detail = added.length ? action + " " + (track || name) : "Encerrou a atividade em " + name;
        emit(id, "activity", detail.slice(0, 220) + ".", (added.length ? "+" : "-") + entry, 5000);
      }
    }
    function onMessage(e) {
      if (e.optimistic) return;
      const m = e.message, mid = m?.id ?? e.id, cid = m?.channel_id ?? m?.channelId ?? e.channelId;
      if (!mid || !cid) return;
      const old = messages.get(mid);
      const record = e.type === "MESSAGE_CREATE" ? m : Stores.MessageStore?.getMessage?.(cid, mid);
      const id = m?.author?.id ?? record?.author?.id ?? old;
      if (!person(id) || ((m?.flags ?? record?.flags ?? 0) & 64)) return;
      const ch = channel(cid);
      if (!ch) return;
      const where = location(ch);
      if (e.type === "MESSAGE_CREATE") {
        if (m.type != null && ![0, 19].includes(m.type)) return;
        messages.set(mid, id);
        if (messages.size > 512) messages.delete(messages.keys().next().value);
        emit(id, "messages", "Enviou uma mensagem " + where + ".", mid);
      } else if (e.type === "MESSAGE_DELETE") {
        messages.delete(mid);
        emit(id, "deletes", "Uma mensagem dessa pessoa foi apagada " + where + ".", mid);
      } else {
        const edited = m?.edited_timestamp ?? m?.editedTimestamp;
        if (edited) emit(id, "edits", "Editou uma mensagem " + where + ".", mid + "/" + edited);
      }
    }
    function onVoice(v) {
      const id = v?.userId ?? v?.user_id;
      if (!person(id)) return;
      const s = snapshot(id);
      const prior = s.voice !== undefined ? s.voice : Stores.VoiceStateStore?.getVoiceStateForUser?.(id)?.channelId;
      const next = v.channelId ?? v.channel_id ?? null;
      s.voice = next;
      if (prior === next || (prior === undefined && next == null)) return;
      const to = channel(next), from = channel(prior);
      if (!to && !from) return;
      const body = to ? (from ? "Mudou de canal de voz para " : "Entrou no canal de voz ") + (to.name || "da conversa")
        : "Saiu do canal de voz " + (from.name || "da conversa");
      emit(id, "voice", body + ".", String(prior) + "/" + next, 2000);
    }
    function baseline() { wipeTransient(); syncAccount(); for (const u of prefs()?.users ?? []) seed(u.id); }
    function process(e) {
      if (e.type === "CONNECTION_CLOSED" || e.type === "LOGOUT") {
        clearTimeout(bootTimer); suspended = true; wipeTransient();
        if (e.type === "LOGOUT") { account = null; redraw(); }
        return;
      }
      if (["CONNECTION_OPEN", "CONNECTION_OPEN_SUPPLEMENTAL", "CONNECTION_RESUMED"].includes(e.type)) {
        suspended = true; clearTimeout(bootTimer);
        bootTimer = setTimeout(() => { if (!dead) { baseline(); suspended = false; redraw(); } }, 0);
        return;
      }
      if (!loaded || suspended || !syncAccount() || !prefs().users.length) return;
      switch (e.type) {
        case "PRESENCE_UPDATE": onPresence(e); break;
        case "PRESENCE_UPDATES": for (const u of e.updates ?? []) onPresence(u); break;
        case "VOICE_STATE_UPDATES": for (const v of e.voiceStates ?? []) onVoice(v); break;
        case "VOICE_STATE_UPDATE": onVoice(e.voiceState ?? e); break;
        case "MESSAGE_CREATE": case "MESSAGE_UPDATE": case "MESSAGE_DELETE": onMessage(e); break;
        case "TYPING_START": {
          if (!person(e.userId)) break;
          const ch = channel(e.channelId);
          if (ch) emit(e.userId, "typing", "Está digitando " + location(ch) + ".", e.channelId, 20000);
          break;
        }
        case "USER_UPDATE": case "USER_PROFILE_FETCH_SUCCESS": {
          const u = e.user ?? e.userProfile?.user;
          if (u && person(u.id)) rememberProfile(snapshot(u.id), u, true);
          break;
        }
        case "GUILD_MEMBER_ADD": case "GUILD_MEMBER_REMOVE": {
          const id = e.user?.id ?? e.userId ?? e.member?.user?.id;
          if (!person(id)) break;
          const guild = Stores.GuildStore?.getGuild?.(e.guildId ?? e.guild_id);
          if (guild) emit(id, "shared", (e.type === "GUILD_MEMBER_ADD" ? "Entrou em " : "Saiu de ") + guild.name + ".", e.type + guild.id, 5000);
          break;
        }
      }
    }
    function start() {
      const types = ["CONNECTION_OPEN", "CONNECTION_OPEN_SUPPLEMENTAL", "CONNECTION_RESUMED", "CONNECTION_CLOSED", "LOGOUT",
        "PRESENCE_UPDATE", "PRESENCE_UPDATES", "VOICE_STATE_UPDATE", "VOICE_STATE_UPDATES", "MESSAGE_CREATE",
        "MESSAGE_UPDATE", "MESSAGE_DELETE", "TYPING_START", "USER_UPDATE", "USER_PROFILE_FETCH_SUCCESS",
        "GUILD_MEMBER_ADD", "GUILD_MEMBER_REMOVE"];
      for (const type of types) {
        cleanups.push(valenced.discord.flux.onFluxEventDispatched(type, e => {
          try { process(e); } catch (err) { logger?.warn?.("UserRadar: " + type, err); }
          return e; // This is a Flux interceptor. Always pass Discord's original action on.
        }));
      }
      writes.then(() => storage.get()).then(data => {
        if (dead) return;
        accounts = { ...(data?.accounts ?? {}) };
        loaded = true; baseline(); redraw();
      }).catch(err => logger?.error?.("UserRadar: falha ao carregar a lista", err));
    }
    function stop() {
      dead = true; clearTimeout(bootTimer);
      if (saveTimer) flush();
      cleanups.splice(0).forEach(fn => fn());
      listeners.clear(); wipeTransient();
    }
    function remove(id) {
      update(p => ({ ...p, users: p.users.filter(u => u.id !== id), log: p.log.filter(e => e.id !== id) }));
      snapshots.delete(id);
      for (const [key, author] of messages) if (author === id) messages.delete(key);
      for (const key of recent.keys()) if (key.startsWith(id + "/")) recent.delete(key);
    }
    function add(id, name) {
      if (!ID.test(id) || (id.length === 20 && id > "18446744073709551615")) return "Cole um ID de usuário do Discord válido.";
      if (!syncAccount() || !loaded) return "Aguarde a conta do Discord carregar.";
      if (id === account) return "Escolha outra pessoa.";
      if (prefs().users.some(u => u.id === id)) return "Essa pessoa já está na lista.";
      update(p => ({ ...p, users: [...p.users, { id, name: name.trim().slice(0, 48), muted: false, overrides: {} }] }));
      seed(id);
      return "";
    }
    return { start, stop, add, remove, display, update, prefs, syncAccount,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); } };
  }

  const ANDROID_STATE = {
    ready: "Canal de notificações ativo.",
    "app-blocked": "O Android bloqueou as notificações do Discord.",
    "channel-blocked": "O canal UserRadar está desativado no Android.",
    unavailable: "O módulo Android ainda não carregou. Reinicie o Discord após instalar o plugin.",
    sent: "Teste enviado. Confira a área de notificações do Android.",
  };
  function RadarScreen({ embedded = false } = {}) {
    const { React: R, ReactNative: N } = valenced.react;
    const { TableRow, TableRowGroup, TableSwitchRow, Text } = valenced.discord.design.Design;
    const h = R.createElement;
    const [, refresh] = R.useReducer(i => i + 1, 0);
    const [id, setId] = R.useState(""), [name, setName] = R.useState("");
    const [error, setError] = R.useState(""), [system, setSystem] = R.useState("");
    const [expanded, setExpanded] = R.useState(null), [history, setHistory] = R.useState(false);
    const [search, setSearch] = R.useState(""), [limit, setLimit] = R.useState(20);
    const session = active;
    R.useEffect(() => {
      const off = session?.subscribe(refresh);
      session?.syncAccount(); refresh();
      const check = () => setSystem(bridge("state"));
      check();
      const sub = N.AppState.addEventListener("change", s => { if (s === "active") { check(); session?.syncAccount(); } });
      return () => { off?.(); sub?.remove?.(); };
    }, [session]);
    const p = session?.prefs();
    const label = (value, key = String(value)) => h(Text, { key, variant: "text-sm/medium", color: "text-muted" }, value);
    if (!p) return label("Ative o plugin e aguarde sua conta do Discord carregar.");
    const row = (key, title, press, sub) => h(TableRow, { key, label: title, subLabel: sub, onPress: press });
    const toggle = (key, title, value, fn) => h(TableSwitchRow, { key, label: title, value: !!value, onValueChange: fn });
    const group = (title, ...children) => h(TableRowGroup, { key: title, title }, ...children);
    const input = (key, placeholder, value, onChangeText, extra) =>
      h(N.TextInput, { key, accessibilityLabel: placeholder, placeholder, placeholderTextColor: "#aab0bb",
        value, onChangeText, autoCorrect: false, autoCapitalize: "none",
        style: { marginVertical: 4, paddingHorizontal: 12, minHeight: 44, backgroundColor: "#232630",
          color: "#f2f3f5", borderColor: "#656a77", borderWidth: 1, borderRadius: 8 }, ...extra });
    const setOption = (key, value) => session.update(cur => ({ ...cur, [key]: value }));
    const setUser = (uid, fn) => session.update(cur => ({ ...cur, users: cur.users.map(u => u.id === uid ? fn(u) : u) }));
    function add() {
      const result = session.add(id.trim(), name);
      setError(result);
      if (!result) { setId(""); setName(""); N.Keyboard.dismiss(); }
    }
    function clock(key, value) {
      return h(ClockField, { key, title: key === "from" ? "Início" : "Fim",
        value, apply: time => setOption(key, time) });
    }
    async function testNotification() {
      try {
        if (bridge("state") === "app-blocked" && N.Platform.OS === "android" && Number(N.Platform.Version) >= 33) {
          await N.PermissionsAndroid.request("android.permission.POST_NOTIFICATIONS");
        }
        setSystem(bridge("notify", ["UserRadar", "Os alertas do UserRadar estão funcionando neste celular.", "test"]));
      } catch { setSystem(bridge("state")); }
    }
    function remove(u) {
      N.Alert.alert("Remover " + session.display(u.id, u) + "?", "O histórico dessa pessoa também será apagado.", [
        { text: "Cancelar", style: "cancel" }, { text: "Remover", style: "destructive", onPress: () => {
          session.remove(u.id); setExpanded(null);
        } },
      ]);
    }
    const people = p.users.map(u => {
      const title = session.display(u.id, u);
      return group(title + " · " + u.id,
        row("open", expanded === u.id ? "Fechar opções" : "Configurar pessoa", () => setExpanded(expanded === u.id ? null : u.id)),
        ...(expanded === u.id ? [
          toggle("mute", "Silenciar notificações dessa pessoa", u.muted, value => setUser(u.id, old => ({ ...old, muted: value }))),
          ...Object.entries(CATEGORIES).map(([key, title]) => toggle(key, title,
            u.overrides?.[key] ?? p.categories[key], value => setUser(u.id, old => ({ ...old, overrides: { ...old.overrides, [key]: value } })))),
          row("reset", "Usar filtros globais", () => setUser(u.id, old => ({ ...old, overrides: {} }))),
          row("remove", "Remover da lista", () => remove(u)),
        ] : []));
    });
    const body = [
      group("Notificações",
        toggle("enabled", "Receber notificações no celular", p.enabled, v => setOption("enabled", v)),
        row("test", "Enviar notificação de teste", testNotification, ANDROID_STATE[system] || "Verificar alertas do Android."),
        row("settings", "Notificações do Android", () => {
          if (bridge("settings") !== true) N.Linking.openSettings().catch(() => setSystem("unavailable"));
        }, "Permissão, som e vibração do canal UserRadar.")),
      group("Horário silencioso", toggle("quiet", "Silenciar durante um período", p.quiet, v => setOption("quiet", v))),
      ...(p.quiet ? [clock("from", p.from), clock("until", p.until),
        ...(p.from === p.until ? [label("Horários iguais silenciam as notificações o dia inteiro.")] : [])] : []),
      group("Atividades", ...Object.entries(CATEGORIES).map(([key, title]) =>
        toggle(key, title, p.categories[key], value => session.update(cur => ({ ...cur, categories: { ...cur.categories, [key]: value } }))))),
      label("Adicionar pessoa pelo ID"),
      input("id", "ID do usuário do Discord", id, setId, { keyboardType: "number-pad", maxLength: 20 }),
      input("name", "Apelido (opcional)", name, setName, { maxLength: 48 }),
      group("Lista de pessoas · " + p.users.length, row("add", "Adicionar à lista", add, error || undefined)),
      ...people,
      group("Histórico no celular", row("history", history ? "Fechar histórico" : "Ver histórico", () => setHistory(!history),
        p.log.length + " de " + MAX_LOG + " eventos recentes")),
    ];
    if (history) {
      body.push(input("search", "Buscar por pessoa, atividade ou ID", search, v => { setSearch(v); setLimit(20); }));
      const term = search.trim().toLowerCase();
      const found = p.log.filter(e => (session.display(e.id, p.users.find(u => u.id === e.id)) + " " + e.id + " " + e.body +
        " " + CATEGORIES[e.category]).toLowerCase().includes(term));
      body.push(...found.slice(0, limit).map((e, i) => label(new Date(e.at).toLocaleString() + " · " +
        session.display(e.id, p.users.find(u => u.id === e.id)) + "\n" + e.body, "event-" + i)));
      if (!found.length) body.push(label(term ? "Nenhum resultado." : "O histórico está vazio."));
      body.push(group("Ações do histórico",
        ...(found.length > limit ? [row("more", "Mostrar mais", () => setLimit(limit + 20))] : []),
        row("clear", "Limpar histórico", () => N.Alert.alert("Limpar o histórico desta conta?", "", [
          { text: "Cancelar", style: "cancel" },
          { text: "Limpar", style: "destructive", onPress: () => setOption("log", []) },
        ]))));
    }
    body.push(label("Os alertas dependem dos eventos que chegam ao Discord. O histórico fica neste celular."));
    return h(embedded ? N.View : N.ScrollView, embedded ? { style: { padding: 12, gap: 10 } } :
      { keyboardShouldPersistTaps: "handled", contentContainerStyle: { padding: 16, gap: 10, paddingBottom: 48 } }, ...body);
  }

  function ClockField({ title, value, apply }) {
    const { React, ReactNative } = valenced.react;
    const { Text, TableRow } = valenced.discord.design.Design;
    const h = React.createElement;
    const [draft, change] = React.useState(value);
    React.useEffect(() => change(value), [value]);
    const valid = CLOCK.test(draft);
    return h(ReactNative.View, null,
      h(Text, { variant: "text-sm/medium", color: "text-muted" }, title + " · horário local (00:00–23:59)"),
      h(ReactNative.TextInput, { value: draft, onChangeText: change, maxLength: 5, accessibilityLabel: title,
        style: { color: "#f2f3f5", backgroundColor: "#232630", padding: 12, borderRadius: 8 } }),
      h(TableRow, { label: valid ? "Salvar " + title.toLowerCase() : "Digite um horário válido (HH:MM)",
        disabled: !valid, onPress: () => { if (valid) { apply(draft); ReactNative.Keyboard.dismiss(); } } }));
  }

  return plugin({
    jsonStorage: { default: { accounts: {} } },
    start({ jsonStorage, cleanup, logger }) {
      const session = makeSession(jsonStorage, logger);
      active = session;
      cleanup(() => { session.stop(); if (active === session) active = null; });
      session.start();
      const settings = valenced.discord.modules.settings;
      cleanup(settings.onSettingsModulesLoaded(() => {
        const off = settings.registerSettingsItem(SETTING, { parent: null, type: "route",
          useTitle: () => "UserRadar",
          IconComponent: () => valenced.react.React.createElement(valenced.components.TableRowAssetIcon, { name: "BellIcon" }),
          screen: { route: "MyDiscordStuff UserRadar", getComponent: () => RadarScreen } });
        const remove = settings.addSettingsItemToSection("VALENCED", SETTING);
        cleanup(() => { remove(); off(); settings.refreshSettings(); });
        settings.refreshSettings();
      }));
    },
    SettingsComponent: () => valenced.react.React.createElement(RadarScreen, { embedded: true }),
  });
})() })
