({ default: (function () {
  "use strict";
  const levels = [225, 250, 300, 350, 400];
  let session;

  function createSession(flux, logger) {
    const { Stores } = flux;
    const listeners = new Set(), desired = new Map(), touched = new Map();
    let room, account, timer, stopped = false;
    let state = { channel: null, people: [], supported: false, message: "" };
    const notify = () => { for (const fn of listeners) fn(); };
    function restore(id) {
      const refs = touched.get(id);
      if (!refs) return;
      for (const [connection, baseline] of refs) {
        try {
          const current = account === Stores.UserStore?.getCurrentUser?.()?.id
            ? Stores.MediaEngineStore?.getLocalVolume?.(id, "default") : undefined;
          connection.setLocalVolume(id, Number.isFinite(current) ? current : baseline);
        } catch (e) { logger.warn(e); }
      }
      touched.delete(id);
    }
    function drop(id) { desired.delete(id); restore(id); }
    function reset() {
      for (const id of desired.keys()) drop(id);
    }
    function refresh() {
      if (stopped) return;
      const users = Stores.UserStore, voices = Stores.VoiceStateStore, media = Stores.MediaEngineStore;
      const me = users?.getCurrentUser?.()?.id;
      const channel = Stores.SelectedChannelStore?.getVoiceChannelId?.() ||
        voices?.getVoiceStateForUser?.(me)?.channelId;
      if (room !== channel || account !== me) reset();
      room = channel; account = me;
      const members = new Set();
      if (channel && me) {
        const records = voices?.getVoiceStatesForChannel?.(channel) || {};
        for (const [key, value] of Object.entries(records)) {
          const id = value?.userId || key;
          if (id !== me && /^\d{15,21}$/.test(id)) members.add(id);
        }
        // Some mobile releases expose DM voice states only through the per-user lookup.
        const dm = Stores.ChannelStore?.getChannel?.(channel);
        for (const id of dm?.recipients || []) {
          if (typeof id === "string" && id !== me && voices?.getVoiceStateForUser?.(id)?.channelId === channel)
            members.add(id);
        }
      }
      for (const id of desired.keys()) if (!members.has(id)) drop(id);
      const engine = media?.getMediaEngine?.();
      const supported = typeof engine?.eachConnection === "function" && typeof media?.getLocalVolume === "function";
      const connections = new Set();
      if (supported && channel) engine.eachConnection(c => {
        if (c && (c.context == null || c.context === "default") && typeof c.setLocalVolume === "function") connections.add(c);
      });
      const people = [];
      for (const id of members) {
        const user = users.getUser?.(id);
        const level = desired.get(id);
        let status = "";
        if (level) {
          const base = media?.getLocalVolume?.(id, "default");
          if (media?.isLocalMute?.(id, "default") || base === 0) {
            restore(id); status = "Silenciado";
          } else if (!Number.isFinite(base) || !connections.size) {
            status = "Aguardando conexão de voz";
          } else {
            let applied = 0;
            const refs = touched.get(id) || new Map();
            for (const c of refs.keys()) if (!connections.has(c)) refs.delete(c);
            for (const c of connections) {
              try {
                c.setLocalVolume(id, level);
                refs.set(c, base);
                applied++;
              } catch (e) { logger.warn(e); }
            }
            touched.set(id, refs);
            status = applied ? level + "% solicitado" : "A conexão recusou o ajuste";
          }
        }
        people.push({ id, name: user?.globalName || user?.username || id, level, status });
      }
      state = { channel, supported, people, message: !channel ? "Entre em uma chamada de voz." :
        !supported ? "Controle de voz indisponível nesta versão do Discord." :
        !people.length ? "Aguardando outra pessoa entrar na chamada." : "" };
      notify();
    }
    function update() {
      try { refresh(); } catch (e) {
        logger.warn(e);
        state = { ...state, supported: false, message: "Não foi possível consultar a conexão de voz." };
        notify();
      }
    }
    function queue() {
      if (!stopped && timer == null) timer = setTimeout(() => { timer = null; update(); }, 150);
    }
    const off = [];
    return {
      start() {
        for (const type of ["VOICE_CHANNEL_SELECT", "VOICE_STATE_UPDATES", "VOICE_STATE_UPDATE",
          "RTC_CONNECTION_STATE", "MEDIA_ENGINE_CONNECTION_CONNECTED", "AUDIO_TOGGLE_LOCAL_MUTE",
          "AUDIO_SET_LOCAL_VOLUME", "LOGOUT", "CONNECTION_OPEN"]) {
          off.push(flux.onFluxEventDispatched(type, action => {
            if (type === "AUDIO_SET_LOCAL_VOLUME" && (action.context == null || action.context === "default")) {
              // The native slider will set the new level just after this interceptor.
              desired.delete(action.userId); touched.delete(action.userId);
            }
            if (type === "LOGOUT") reset();
            queue();
            return action;
          }));
        }
        update();
      },
      stop() { stopped = true; clearTimeout(timer); for (const remove of off) remove(); reset(); listeners.clear(); },
      change(id, level) {
        update();
        if (level == null) drop(id);
        else if (state.supported && levels.includes(level) && state.people.some(p => p.id === id)) desired.set(id, level);
        update();
      },
      update, read: () => state,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
  }

  function SettingsComponent() {
    const { React, ReactNative: N } = valenced.react;
    const { TableRow, TableRowGroup } = valenced.discord.design.Design;
    const h = React.createElement, active = session;
    const [selected, select] = React.useState(null);
    if (!active) return h(N.Text, null, "Ative o Volume Booster para ajustar a chamada.");
    return h(Controls, { active, selected, select, TableRow, TableRowGroup });
  }
  function Controls({ active, selected, select, TableRow, TableRowGroup }) {
    const { React, ReactNative: N } = valenced.react, h = React.createElement;
    const state = React.useSyncExternalStore(active.subscribe, active.read);
    React.useEffect(() => { active.update(); }, [active]);
    const person = state.people.find(p => p.id === selected);
    return h(N.View, null,
      h(TableRowGroup, { title: "Pessoas na chamada" },
        ...state.people.map(p => h(TableRow, { key: p.id, label: p.name, subLabel: p.status || "Volume do Discord",
          onPress: () => select(p.id) })),
        h(TableRow, { label: "Atualizar chamada", subLabel: state.message || undefined, onPress: active.update })),
      person && h(TableRowGroup, { title: "Volume de " + person.name },
        ...levels.map(n => h(TableRow, { key: n, label: n + "%", disabled: !state.supported,
          subLabel: person.level === n ? person.status : undefined, onPress: () => active.change(person.id, n) })),
        h(TableRow, { label: "Voltar ao volume do Discord", onPress: () => active.change(person.id, null) })));
  }

  return plugin({
    start({ cleanup, logger }) {
      const active = createSession(valenced.discord.flux, logger);
      session = active;
      cleanup(() => { active.stop(); if (session === active) session = undefined; });
      active.start();
    },
    SettingsComponent,
  });
})() })
