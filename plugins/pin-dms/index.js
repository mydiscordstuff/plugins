({default:(function () {
  "use strict";
  const ROOT = "modules/main_tabs_v2/native/tabs/messages/";
  const KEY = "MyDiscordStuffPinDMs";
  const EMPTY = { groups: [], labels: {} };
  const PALETTE = ["#52C783", "#E45A68", "#6595FF", "#AD83FF", "#FEAD54", "#EA87C6"];
  const HEIGHT = 44;
  let live, pending = Promise.resolve();

  function session(storage, stores, logger) {
    let data, alive = true, revision = 0;
    const listeners = new Set();
    const owner = () => stores.UserStore?.getCurrentUser?.()?.id;
    const notify = () => { revision++; for (const f of listeners) f(); };
    function read() { return alive && data && owner() ? data.accounts[owner()] || EMPTY : EMPTY; }
    function change(id, fn) {
      if (!alive || !data || !id || id !== owner()) return;
      const next = fn(read());
      data = { accounts: { ...data.accounts, [id]: next } };
      const snapshot = data;
      pending = pending.then(() => storage.set(snapshot, true)).catch(e => logger?.error?.("PinDMs: falha ao salvar", e));
      notify();
    }
    pending.then(() => storage.get()).then(value => {
      if (alive) { data = { accounts: value?.accounts || {} }; notify(); }
    }).catch(e => logger?.error?.("PinDMs: falha ao carregar categorias", e));
    return { owner, read, change, notify, ready: () => alive && !!data && !!owner(),
      subscribe(f) { listeners.add(f); return () => listeners.delete(f); }, revision: () => revision,
      stop() { alive = false; notify(); listeners.clear(); } };
  }

  function move(list, index, by) {
    const to = index + by;
    if (index < 0 || to < 0 || to >= list.length) return list;
    const result = list.slice();
    [result[index], result[to]] = [result[to], result[index]];
    return result;
  }
  function assign(p, channelId, groupId) {
    if (groupId && !p.groups.some(g => g.id === groupId)) return p;
    return { ...p, groups: p.groups.map(g => ({ ...g, ids: g.id === groupId
      ? (g.ids.includes(channelId) ? g.ids : [...g.ids, channelId]) : g.ids.filter(i => i !== channelId) })) };
  }
  function color(raw) {
    const value = raw.trim().replace(/^#/, "");
    return /^[\da-f]{6}$/i.test(value) ? "#" + value.toUpperCase() : null;
  }
  function splitGroups(groups, rows) {
    const available = new Map(rows.map(r => [r.channelId, r])), claimed = new Set();
    const pinned = groups.map(g => {
      const matches = [];
      for (const id of g.ids) {
        if (!available.has(id) || claimed.has(id)) continue;
        claimed.add(id);
        if (!g.collapsed) matches.push(available.get(id));
      }
      return { group: g, rows: matches, count: g.ids.filter(id => available.has(id)).length };
    });
    return { pinned, claimed };
  }
  function header(key, group, count) { return { kind: "pin-dms-header", key, group, count }; }
  function flatProps(props, prefs, renderHeader, React, height) {
    const isDM = r => r && (r.kind === "channel" || r.kind === "favorite");
    const native = props.data;
    if (!Array.isArray(native) || !native.some(isDM) || typeof props.renderItem !== "function") return null;
    const dm = native.filter(isDM), { pinned, claimed } = splitGroups(prefs.groups, dm);
    const prefix = pinned.flatMap(({ group, rows, count }) => [header(group.id, group, count), ...rows]);
    if (dm.some(r => !claimed.has(r.channelId))) prefix.push(header("other", null));
    const first = native.findIndex(isDM);
    const data = [...native.slice(0, first), ...prefix, ...native.slice(first).filter(r => !isDM(r) || !claimed.has(r.channelId))];
    const isHeader = r => r?.kind === "pin-dms-header";
    const extraHeight = prefix.filter(isHeader).length * HEIGHT - (claimed.size - pinned.reduce((n, g) => n + g.rows.length, 0)) * height;
    const next = { data,
      renderItem(info, ...args) {
        if (isHeader(info.item)) return renderHeader(info.item);
        const row = props.renderItem(info, ...args);
        if (info.item?.kind === "friendsHeader" && React.isValidElement(row) && typeof row.props.stickyAt === "number")
          return React.cloneElement(row, { stickyAt: row.props.stickyAt + extraHeight });
        return row;
      },
      keyExtractor: (r, i) => isHeader(r) ? "pin-dms:" + r.key : props.keyExtractor(r, i),
      getItemType: (r, ...rest) => isHeader(r) ? r.kind : props.getItemType?.(r, ...rest) ?? r.kind,
    };
    if (props.getFixedItemSize) next.getFixedItemSize = (r, ...args) => isHeader(r) ? HEIGHT : props.getFixedItemSize(r, ...args);
    if (Array.isArray(props.stickyHeaderIndices))
      next.stickyHeaderIndices = props.stickyHeaderIndices.map(i => data.indexOf(native[i])).filter(i => i >= 0);
    return next;
  }
  function fastProps(props, source, prefs, renderHeader) {
    const counts = props.sections, inputs = [source?.channelFavorites, source?.channels];
    if (!Array.isArray(counts) || !inputs.every(Array.isArray) || !inputs.some(a => a.length) ||
        !inputs.every((a, i) => a.length === counts[i]) || typeof props.itemSize !== "function") return null;
    const original = inputs.map((channels, section) => channels.map((r, row) => ({ channelId: r.channelId, section, row })));
    const { pinned, claimed } = splitGroups(prefs.groups, original.flat());
    const sections = [];
    for (const {group, rows, count} of pinned) {
      sections.push({ head: header(group.id, group, count), length: 1 });
      if (rows.length) sections.push({ rows, length: rows.length });
    }
    if (original.some(a => a.some(r => !claimed.has(r.channelId)))) sections.push({ head: header("other", null), length: 1 });
    counts.forEach((length, section) => {
      const rows = original[section]?.filter(r => !claimed.has(r.channelId));
      sections.push({ section, rows, length: rows?.length ?? length });
    });
    const origin = (s, r) => sections[s]?.rows?.[r] || { section: sections[s]?.section, row: r };
    const next = { sections: sections.map(s => s.length),
      renderItem(s, r, ...rest) {
        if (sections[s].head) return renderHeader(sections[s].head);
        const o = origin(s, r); return props.renderItem(o.section, o.row, ...rest);
      },
      itemSize(s, r, ...rest) {
        if (sections[s].head) return HEIGHT;
        const o = origin(s, r ?? 0);
        return props.itemSize(o.section, o.row, ...rest);
      },
      keyExtractor(type, s, r, ...rest) {
        const slot = sections[s];
        if (!slot) return props.keyExtractor?.(type, s, r, ...rest);
        if (type === 0) {
          if (slot.head) return "pin-dms:" + slot.head.key;
          const o = origin(s, r); return props.keyExtractor?.(type, o.section, o.row, ...rest);
        }
        if (slot.section != null) return props.keyExtractor?.(type, slot.section, r, ...rest);
      },
    };
    for (const name of ["sectionHeaderSize","renderSectionHeader","sectionFooterSize","renderSectionFooter"]) {
      if (typeof props[name] === "function") next[name] = (s, ...args) =>
        sections[s]?.section != null ? props[name](sections[s].section, ...args) : name.endsWith("Size") ? 0 : null;
    }
    return next;
  }
  function useStateOf(s) {
    const R = valenced.react.React;
    return R.useSyncExternalStore(s.subscribe, s.revision);
  }
  function dmTitle(ch, stores) {
    if (!ch) return "";
    if (ch.name) return ch.name;
    const names = (ch.recipients || []).map(r => typeof r === "string" ? stores.UserStore?.getUser?.(r) : r)
      .map(u => u?.globalName || u?.global_name || u?.username).filter(Boolean);
    return names.join(", ") || ch.id;
  }
  function decorated(tree, ch, label) {
    const R = valenced.react.React;
    const title = dmTitle(ch, valenced.discord.flux.Stores);
    let done = false;
    function visit(el) {
      if (done || !R.isValidElement(el)) return el;
      const p = el.props || {};
      const styled = typeof p.userName === "string" && p.userId;
      const plain = typeof p.children === "string" &&
        ((p.lineClamp === 1 && p.ellipsizeMode === "tail") || p.children === title);
      if (styled || plain) {
        done = true;
        const name = label.name || (styled ? p.userName : p.children);
        const style = label.color ? [p.style, { color: label.color }] : p.style;
        if (styled && label.color) return R.createElement(valenced.discord.design.Design.Text,
          { key: el.key, style, variant: p.variant || "text-md/semibold", lineClamp: 1, ellipsizeMode: "tail" }, name);
        return styled ? R.cloneElement(el, { userName: name }) : R.cloneElement(el, { style }, name);
      }
      if (!p.children) return el;
      const kids = Array.isArray(p.children) ? p.children.map(visit) : visit(p.children);
      return done ? R.cloneElement(el, {}, kids) : el;
    }
    return visit(tree);
  }
  function LiveTitle({tree, ch, s}) {
    useStateOf(s);
    const label = s.read().labels[ch?.id];
    return label ? decorated(tree, ch, label) : tree;
  }
  function Header({item, s}) {
    const {React:R, ReactNative:N} = valenced.react, h = R.createElement;
    const g = item.group, owner = s.owner();
    const text = g ? (g.collapsed ? "▸ " : "▾ ") + g.name + "  ·  " + item.count : "Outras conversas";
    return h(N.Pressable, { disabled: !g, accessibilityRole: g ? "button" : "header",
      accessibilityState: g ? { expanded: !g.collapsed } : undefined,
      onPress: () => s.change(owner, p => ({ ...p, groups: p.groups.map(x => x.id === g.id ? {...x, collapsed: !x.collapsed} : x) })),
      style:{ height:HEIGHT, paddingHorizontal:16, justifyContent:"center" } },
      h(valenced.discord.design.Design.Text, { variant:"text-sm/semibold", numberOfLines:1, style:g ? {color:g.color} : undefined }, text));
  }
  function LiveList({tree, source, height, fastest, s}) {
    useStateOf(s);
    const R = valenced.react.React, p = s.read();
    return R.useMemo(() => {
      if (!p.groups.length || !R.isValidElement(tree)) return tree;
      const draw = item => R.createElement(Header, { item, s });
      const next = fastest ? fastProps(tree.props, source, p, draw) : flatProps(tree.props, p, draw, R, height || 64);
      return next ? R.cloneElement(tree, next) : tree;
    }, [tree, source, height, fastest, p, s]);
  }

  function Manager({ embedded = false }) {
    const { React:R, ReactNative:N } = valenced.react;
    const { Text } = valenced.discord.design.Design, h = R.createElement;
    const s = live;
    if (!s) return h(Text, {variant:"text-md/normal"}, "Ative o PinDMs para organizar suas conversas.");
    return h(Editor, {s, embedded});
  }
  function Editor({s, embedded}) {
    useStateOf(s);
    const { React:R, ReactNative:N } = valenced.react;
    const {TableRow, TableRowGroup, Text} = valenced.discord.design.Design, h = R.createElement;
    const stores = valenced.discord.flux.Stores, owner = s.owner(), p = s.read();
    const [edit, setEdit] = R.useState(null), [title, setTitle] = R.useState(""), [ink, setInk] = R.useState("");
    const [query, setQuery] = R.useState(""), [max, setMax] = R.useState(20), [err, setErr] = R.useState("");
    R.useEffect(() => { setEdit(null); setQuery(""); setErr(""); }, [owner]);
    R.useEffect(() => {
      const sort = stores.PrivateChannelSortStore;
      sort?.addChangeListener?.(s.notify);
      return () => sort?.removeChangeListener?.(s.notify);
    }, [s]);
    const body = [], byId = id => stores.ChannelStore?.getChannel?.(id);
    const row = (key, label, fn, subLabel) => h(TableRow, {key,label,subLabel,onPress:fn});
    const group = (title, items) => h(TableRowGroup, {key:title,title}, ...items);
    const note = (value,k=value) => h(Text,{key:k,variant:"text-sm/medium",color:"text-muted"},value);
    const input = (key, hint, value, set, opts={}) => h(N.TextInput,{key, accessibilityLabel:hint, placeholder:hint, placeholderTextColor:"#b7bcc9",
      value,onChangeText:set,autoCorrect:false,style:{backgroundColor:"#232630",color:"#f5f6fa",minHeight:44,paddingHorizontal:12,borderRadius:8},...opts});
    const write = fn => s.change(owner,fn);
    const set = (item, name, c) => {setEdit(item);setTitle(name || "");setInk(c || "");setErr("");};
    const back = () => {setEdit(null);setErr("");};
    const changeGroup = (id, fn) => write(curr => ({...curr,groups:curr.groups.map(g => g.id === id ? fn(g) : g)}));
    const chosen = edit?.type === "group" ? p.groups.find(g => g.id === edit.id) : null;
    const currentId = edit?.type === "dm" ? edit.id : null;
    const startDM = id => {const l = p.labels[id];set({type:"dm",id},l?.name,l?.color);};
    function saveStyle() {
      const name = title.trim(), normalized = color(ink);
      if ((!currentId && !name) || ((!currentId || ink.trim()) && !normalized)) {
        setErr(!currentId && !name ? "Digite um nome para a categoria." : "Use uma cor hexadecimal, como #52C783."); return;
      }
      if (currentId) write(curr => {
        const labels = {...curr.labels};
        if (name || normalized) labels[currentId] = { name, color: normalized }; else delete labels[currentId];
        return {...curr,labels};
      });
      else if (chosen) changeGroup(chosen.id,g => ({...g,name,color:normalized}));
      else if (edit.type === "new") {
        const id = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
        write(curr => ({...curr,groups:[...curr.groups,{id,name,color:normalized,collapsed:false,ids:[]}]}));
      }
      N.Keyboard.dismiss();back();
    }
    if (!s.ready()) return note("Aguardando sua conta e suas categorias…");
    if (edit) {
      body.push(group("PinDMs", [row("back","Voltar às categorias",back)]));
      body.push(note(currentId ? "Conversa · " + (dmTitle(byId(currentId),stores) || currentId) : chosen ? "Editar categoria" : "Nova categoria"));
      body.push(input("title",currentId ? "Apelido local (opcional)" : "Nome da categoria",title,setTitle,{maxLength:64}));
      body.push(input("color",currentId ? "Cor do nome (opcional)" : "Cor da categoria (#RRGGBB)",ink,setInk,{maxLength:7,autoCapitalize:"characters"}));
      body.push(h(N.View,{key:"palette",style:{flexDirection:"row",flexWrap:"wrap"}},...PALETTE.map(c =>
        h(N.Pressable,{key:c,onPress:()=>setInk(c),accessibilityRole:"button",accessibilityLabel:"Usar cor "+c,
          style:{width:44,height:44,alignItems:"center",justifyContent:"center"}},h(N.View,{style:{width:26,height:26,borderRadius:13,backgroundColor:c,borderWidth:c===color(ink)?3:0,borderColor:"#fff"}})))));
      if (err) body.push(note(err));
      body.push(group("Aparência",[row("save","Salvar nome e cor",saveStyle)]));
      if (currentId) {
        const current = p.groups.find(g => g.ids.includes(currentId));
        body.push(group("Mover conversa",[
          ...p.groups.map(g => row(g.id,(current?.id === g.id ? "✓ " : "") + g.name,()=>{write(c=>assign(c,currentId,g.id));back();})),
          row("normal","Sem categoria",()=>{write(c=>assign(c,currentId,null));back();})]));
      }
      if (chosen) {
        const idx = p.groups.indexOf(chosen);
        const shift = by => write(c=>({...c,groups:move(c.groups,c.groups.findIndex(g=>g.id===chosen.id),by)}));
        const actions=[];
        if(idx>0) actions.push(row("up","Subir categoria",()=>shift(-1)));
        if(idx<p.groups.length-1) actions.push(row("down","Descer categoria",()=>shift(1)));
        actions.push(row("remove","Excluir categoria",()=>N.Alert.alert("Excluir "+chosen.name+"?","As conversas voltam à lista normal.",[
          {text:"Cancelar",style:"cancel"},{text:"Excluir",style:"destructive",onPress:()=>{write(c=>({...c,groups:c.groups.filter(g=>g.id!==chosen.id)}));back();}}])));
        body.push(group("Organização",actions));
        if(chosen.ids.length) body.push(group("Ordem das conversas",chosen.ids.flatMap((id,i)=>{
          const label=p.labels[id]?.name || dmTitle(byId(id),stores) || id;
          const reorder=by=>changeGroup(chosen.id,g=>({...g,ids:move(g.ids,g.ids.indexOf(id),by)}));
          return [row(id,label,()=>startDM(id)),...(i>0?[row(id+"up","↑ Subir "+label,()=>reorder(-1))]:[])];
        })));
      }
    } else {
      body.push(group("Categorias",[
        ...p.groups.map(g=>row(g.id,g.name,()=>set({type:"group",id:g.id},g.name,g.color),g.ids.length+" conversa(s) · "+g.color)),
        row("new","Criar categoria",()=>set({type:"new"},"",PALETTE[p.groups.length%PALETTE.length]))]));
      body.push(note("Selecione uma conversa para movê-la ou personalizar o nome e a cor na sua lista de DMs."));
      body.push(input("query","Buscar conversa por nome, apelido ou ID",query,v=>{setQuery(v);setMax(20);}));
      const sorted = stores.PrivateChannelSortStore?.getSortedChannels?.() || [];
      const ids = new Set(sorted.flat().map(r=>r.channelId).filter(Boolean));
      const term=query.trim().toLowerCase();
      const results=Array.from(ids).map(id=>({id,name:dmTitle(byId(id),stores)||id,alias:p.labels[id]?.name}))
        .filter(r=>[r.name,r.alias,r.id].some(v=>v?.toLowerCase().includes(term)));
      const items=results.slice(0,max).map(r=>row(r.id,r.alias||r.name,()=>startDM(r.id),
        [r.alias?r.name:null,p.groups.find(g=>g.ids.includes(r.id))?.name || "Sem categoria"].filter(Boolean).join(" · ")));
      if(results.length>max) items.push(row("more","Mostrar mais conversas",()=>setMax(max+20)));
      if(items.length) body.push(group("Conversas",items)); else body.push(note("Nenhuma conversa encontrada."));
    }
    return h(embedded?N.View:N.ScrollView,embedded?{style:{padding:12,gap:10}}:
      {keyboardShouldPersistTaps:"handled",contentContainerStyle:{padding:16,paddingBottom:48,gap:10}},...body);
  }

  return plugin({
    jsonStorage:{default:{accounts:{}}},
    start({jsonStorage,cleanup,logger,plugin:instance}) {
      const {React:R} = valenced.react, stores = valenced.discord.flux.Stores;
      const s = session(jsonStorage,stores,logger); live = s;
      cleanup(()=>{s.stop();if(live===s)live=null;});
      const users=stores.UserStore;
      let lastAccount=s.owner();
      const accountChanged=()=>{const id=s.owner();if(id!==lastAccount){lastAccount=id;s.notify();}};
      users?.addChangeListener?.(accountChanged);cleanup(()=>users?.removeChangeListener?.(accountChanged));
      const settings=valenced.discord.modules.settings;
      cleanup(settings.onSettingsModulesLoaded(()=>{
        const remove=settings.registerSettingsItem(KEY,{type:"route",parent:null,useTitle:()=>"PinDMs",
          IconComponent:()=>R.createElement(valenced.components.TableRowAssetIcon,{name:"PinIcon"}),
          screen:{route:"MyDiscordStuff PinDMs",getComponent:()=>Manager}});
        const detach=settings.addSettingsItemToSection("VALENCED",KEY);
        cleanup(()=>{detach();remove();settings.refreshSettings();}); settings.refreshSettings();
      }));
      const finder=valenced.discord.utils.modules.finders.getModuleWithImportedPath;
      function hook(path, wrap) {
        cleanup(finder(ROOT+path+".tsx",ns=>{
          const component=ns.default ?? ns;
          let host=component,key;
          if(typeof component.type==="function") key="type";
          else if(typeof component.type?.render==="function"){host=component.type;key="render";}
          else if(typeof component.render==="function") key="render";
          else if(typeof ns.default==="function"){host=ns;key="default";}
          if(!key){logger?.warn?.("PinDMs: componente incompatível: "+path);return;}
          cleanup(valenced.patcher.instead(host,key,function(args,original){
            const tree=original.apply(this,args);
            return tree ? wrap(tree,args[0]||{}) : tree;
          }));
        }));
      }
      for(const kind of ["Fastest","Flash","Legend"]) hook("Messages"+kind+"List",(tree,props)=>
        R.createElement(LiveList,{tree,source:props.data,height:props.listItemHeight,fastest:kind==="Fastest",s}));
      hook("items/channel/MessagesItemChannelContent",(tree,props)=>R.createElement(LiveTitle,{tree,ch:props.channel,s}));
      if(instance?.startedLate) instance.requireReload?.();
    },
    SettingsComponent:()=>valenced.react.React.createElement(Manager,{embedded:true}),
  });
})()})
