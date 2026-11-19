({ default: (function () {
  "use strict";
  const durations = { s5: 5000, s10: 10000, fast: 15000, s20: 20000, normal: 30000,
    s45: 45000, slow: 60000, s90: 90000, s120: 120000 };
  const effects = {
    rainbow: "Arco-íris suave", chroma: "Chroma pulsante", wave: "Onda de cores",
    pulse: "Pulso RGB",
  };
  const areas = [
    { key: "background", title: "Fundo", offset: 0 },
    { key: "buttons", title: "Botões", offset: 1 / 3 },
    { key: "text", title: "Texto", offset: 2 / 3 },
  ];
  const defaults = { speed: "normal", paused: false, rgb: true, effect: "rainbow",
    background: "#000000", buttons: "#6949aa", text: "#e2c9ff" };
  const owns = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  function canonicalHex(value) {
    if (typeof value !== "string") return null;
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
    if (!match) return null;
    const digits = match[1].toLowerCase();
    return "#" + (digits.length === 3 ? digits.replace(/./g, c => c + c) : digits);
  }
  function readSettings(value) {
    const result = { ...defaults };
    if (!value) return result;
    result.rgb = typeof value.rgb === "boolean" ? value.rgb : value.effect !== "fixed";
    if (owns(effects, value.effect)) result.effect = value.effect;
    if (owns(durations, value.speed)) result.speed = value.speed;
    result.paused = value.paused === true;
    for (const { key } of areas) {
      result[key] = canonicalHex(value[key]) || defaults[key];
    }
    return result;
  }
  const tokenRole = new Map();
  function assign(role, names) {
    for (const name of names.trim().split(/\s+/)) tokenRole.set(name, role);
  }

  // Discord uses different semantic names across screens and mobile releases.
  assign("surface", `
    BACKGROUND_BASE_LOW BACKGROUND_BASE_LOWER BACKGROUND_BASE_LOWEST BACKGROUND_BASE_HIGH
    BACKGROUND_BASE_HIGHER BACKGROUND_BASE_HIGHEST BACKGROUND_PRIMARY BACKGROUND_SECONDARY
    BACKGROUND_SECONDARY_ALT BACKGROUND_TERTIARY BACKGROUND_QUATERNARY BACKGROUND_MOBILE_PRIMARY
    BACKGROUND_MOBILE_SECONDARY BACKGROUND_MOBILE_TERTIARY BACKGROUND_FLOATING
    BACKGROUND_NESTED_FLOATING BACKGROUND_SURFACE_HIGH BACKGROUND_SURFACE_HIGHEST
    BACKGROUND_MOD_SUBTLE BACKGROUND_MOD_MUTED BACKGROUND_MOD_NORMAL BACKGROUND_MOD_STRONG
    BACKGROUND_ACCENT BACKGROUND_OVERLAY BACKGROUND_CONTENT_PRIMARY BACKGROUND_CONTENT_SECONDARY
    BACKGROUND_APP_LAUNCHER_CARD_DEFAULT BACKGROUND_APP_LAUNCHER_ROW_DEFAULT PANEL_BG
    BG_SURFACE_OVERLAY BG_SURFACE_OVERLAY_TMP BG_SURFACE_RAISED BG_BASE_PRIMARY BG_BASE_SECONDARY
    BG_BASE_TERTIARY CARD_BACKGROUND_DEFAULT CARD_MUTED_BG CARD_MUTED_PRESSED_BG CARD_SECONDARY_BG
    CARD_SECONDARY_BACKGROUND_DEFAULT CARD_SECONDARY_BACKGROUND_ACTIVE DEFAULT_BACKGROUND
    DEFAULT_BACKGROUND_COLOR GUILD_FOLDER_BACKGROUND MOBILE_GUILDBAR_ICON_BACKGROUND_DEFAULT
    MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT MOBILE_EMOJI_BUTTON_BACKGROUND
    INPUT_BACKGROUND_DEFAULT MOBILE_SEGMENTED_CONTROL_BACKGROUND
    MOBILE_CHANNEL_ITEM_BACKGROUND_DEFAULT REDESIGN_CHAT_INPUT_BACKGROUND
    REDESIGN_INPUT_CONTROL_ACTIVE_BG ANDROID_NAVIGATION_SCRIM_BACKGROUND TABLEROW_BACKGROUND_DEFAULT
    TABLEROW_BACKGROUND_PRESSED EMBED_BACKGROUND REACTION_BACKGROUND_DEFAULT STAGE_CARD_PILL_BG
    CONTROL_ICON_ONLY_BACKGROUND_ACTIVE CONTROL_ICON_ONLY_BACKGROUND_DEFAULT
    INTERACTIVE_BACKGROUND_DEFAULT INTERACTIVE_BACKGROUND_ACTIVE CHAT_INPUT_BACKGROUND
    SEARCH_INPUT_BACKGROUND SURFACE_PRIMARY SURFACE_SECONDARY SURFACE_TERTIARY SURFACE_RAISED
    BACKGROUND_INPUT BACKGROUND_SHELF BACKGROUND_POPOUT BACKGROUND_CONTEXT_MENU
    REDESIGN_CHAT_INPUT_BACKGROUND_FOCUSED SEARCH_INPUT_BACKGROUND_DEFAULT
    MOBILE_BOTTOM_NAV_BACKGROUND MOBILE_BOTTOM_NAVIGATION_BACKGROUND MOBILE_SEARCH_BACKGROUND
    MOBILE_GUILD_HEADER_BACKGROUND BG_BASE_LOWEST BG_BASE_LOWER BG_BASE_LOW BG_SURFACE_LOW
    BG_SURFACE_LOWER MOBILE_CHANNEL_HEADER_BACKGROUND CHAT_BACKGROUND CHANNELTEXTAREA_BACKGROUND
    BACKGROUND_MESSAGE_NORMAL MODAL_BACKGROUND MODAL_FOOTER CHANNEL_BACKGROUND_DEFAULT
    MOBILE_FLOATINGBAR_BACKGROUND MOBILE_FLOATINGBAR_BACKGROUND_HIGHER`);
  assign("shade", `
    MESSAGE_BACKGROUND_HOVER BACKGROUND_MESSAGE_HOVER CONTROL_SECONDARY_BACKGROUND_DEFAULT
    CONTROL_SECONDARY_BACKGROUND_ACTIVE INTERACTIVE_BACKGROUND_HOVER INTERACTIVE_BACKGROUND_SELECTED
    REDESIGN_BUTTON_SECONDARY_BACKGROUND REDESIGN_BUTTON_TERTIARY_BACKGROUND
    REDESIGN_BUTTON_TERTIARY_PRESSED_BACKGROUND REDESIGN_BUTTON_SECONDARY_PRESSED_BACKGROUND
    CONTROL_OVERLAY_SECONDARY_BACKGROUND_DEFAULT MOBILE_CHANNEL_ITEM_BACKGROUND_ACTIVE
    REDESIGN_BUTTON_TERTIARY_HOVER_BACKGROUND BACKGROUND_MODIFIER_SELECTED BACKGROUND_MODIFIER_HOVER
    BUTTON_SECONDARY_BACKGROUND BUTTON_FILLED_SECONDARY_BACKGROUND
    CONTROL_SECONDARY_BACKGROUND_HOVER REDESIGN_BUTTON_SECONDARY_HOVER_BACKGROUND
    BUTTON_SECONDARY_BACKGROUND_HOVER BUTTON_FILLED_SECONDARY_BACKGROUND_HOVER
    BUTTON_SECONDARY_BACKGROUND_ACTIVE BUTTON_FILLED_SECONDARY_BACKGROUND_ACTIVE`);
  assign("fill", `
    REDESIGN_BUTTON_PRIMARY_PRESSED_BACKGROUND REDESIGN_BUTTON_PRIMARY_BACKGROUND
    CONTROL_PRIMARY_BACKGROUND_DEFAULT CONTROL_PRIMARY_BACKGROUND_ACTIVE
    CONTROL_OVERLAY_PRIMARY_BACKGROUND_DEFAULT BACKGROUND_BRAND BACKGROUND_BRAND_HOVER
    BACKGROUND_BRAND_ACTIVE CONTROL_EXPRESSIVE_BACKGROUND_DEFAULT
    CONTROL_EXPRESSIVE_BACKGROUND_ACTIVE REDESIGN_INPUT_CONTROL_SELECTED
    CONTROL_CONNECTED_BACKGROUND_DEFAULT CONTROL_CONNECTED_BACKGROUND_ACTIVE
    CHECKBOX_BACKGROUND_SELECTED SWITCH_BACKGROUND_SELECTED RADIO_BACKGROUND_SELECTED
    BUTTON_FILLED_BRAND_BACKGROUND PROGRESSBAR_INDICATOR_BACKGROUND SLIDER_THUMB_BACKGROUND
    SLIDER_TRACK_FILL BADGE_BACKGROUND_DEFAULT THREAD_CHANNEL_SPINE
    BUTTON_FILLED_BRAND_BACKGROUND_HOVER BUTTON_FILLED_BRAND_BACKGROUND_ACTIVE
    CONTROL_PRIMARY_BACKGROUND_HOVER REDESIGN_BUTTON_PRIMARY_HOVER_BACKGROUND
    BUTTON_PRIMARY_BACKGROUND`);
  assign("text", `
    TEXT_NORMAL TEXT_DEFAULT TEXT_PRIMARY TEXT_STRONG MOBILE_TEXT_HEADING_PRIMARY
    TEXT_HEADER_PRIMARY TEXT_BODY_PRIMARY TEXT_MESSAGE_DEFAULT REDESIGN_CHANNEL_NAME_TEXT
    REDESIGN_CHANNEL_NAME_ACTIVE_TEXT CHANNEL_TEXT CHANNEL_TEXT_DEFAULT INTERACTIVE_TEXT_DEFAULT
    INTERACTIVE_TEXT_HOVER INTERACTIVE_TEXT_ACTIVE INTERACTIVE_TEXT_SELECTED BUTTON_TEXT
    BUTTON_TEXT_DEFAULT BUTTON_TEXT_ACTIVE MOBILE_TEXT_HEADING_DEFAULT MOBILE_TEXT_HEADING_BOLD
    TEXT_BRAND TEXT_HEADING TEXT_MESSAGE_HEADING TEXT_DISPLAY TEXT_TITLE TEXT_LINK TEXT_LINK_DEFAULT
    TEXT_LINK_HOVER TEXT_ACCENT MENTION_FOREGROUND MENTION_BACKGROUND_TEXT CHANNEL_ICON
    CHANNEL_ICON_DEFAULT CHANNEL_ICON_ACTIVE INTERACTIVE_ICON_DEFAULT INTERACTIVE_ICON_HOVER
    INTERACTIVE_ICON_ACTIVE INTERACTIVE_ICON_SELECTED MOBILE_HEADER_ICON_DEFAULT
    MOBILE_HEADER_ICON_ACTIVE MOBILE_HEADER_ICON_HOVER ICON_DEFAULT ICON_PRIMARY ICON_SECONDARY
    ICON_ACTIVE ICON_INTERACTIVE ICON_MUTED REDESIGN_CHANNEL_ICON CONTROL_ICON_DEFAULT
    CONTROL_ICON_ACTIVE BUTTON_OUTLINE_BRAND_TEXT BUTTON_OUTLINE_BRAND_BORDER TEXT_ACCENT_DEFAULT
    MOBILE_BOTTOM_NAV_ICON_DEFAULT MOBILE_BOTTOM_NAV_ICON_ACTIVE MOBILE_NAVIGATION_ICON_DEFAULT
    MOBILE_NAVIGATION_ICON_ACTIVE INTERACTIVE_NORMAL CHANNELS_DEFAULT TEXT_CHAT_INPUT
    MOBILE_TEXT_PRIMARY HEADER_PRIMARY INTERACTIVE_HOVER INTERACTIVE_ACTIVE`);
  assign("muted", `
    MOBILE_TEXT_HEADING_SECONDARY TEXT_HEADER_SECONDARY TEXT_BODY_SECONDARY TEXT_SUBTLE
    TEXT_LOW_CONTRAST TEXT_MUTED TEXT_SECONDARY TEXT_TERTIARY TEXT_DISABLED TEXT_FAINT
    TEXT_PLACEHOLDER TEXT_HINT REDESIGN_CHANNEL_NAME_MUTED_TEXT INTERACTIVE_MUTED CHANNEL_ICON_MUTED
    INTERACTIVE_TEXT_MUTED MOBILE_TEXT_MUTED MOBILE_TEXT_SECONDARY TEXT_DEFAULT_SECONDARY
    TEXT_SUBTLE_DEFAULT HEADER_SECONDARY INPUT_PLACEHOLDER_TEXT CHANNEL_TEXT_MUTED CHANNELS_MUTED`);
  assign("label", `
    BUTTON_TEXT_PRIMARY BUTTON_TEXT_SECONDARY REDESIGN_BUTTON_PRIMARY_TEXT
    REDESIGN_BUTTON_SECONDARY_TEXT REDESIGN_BUTTON_TERTIARY_TEXT CONTROL_PRIMARY_TEXT_DEFAULT
    CONTROL_PRIMARY_TEXT_ACTIVE CONTROL_SECONDARY_TEXT_DEFAULT CONTROL_SECONDARY_TEXT_ACTIVE
    CONTROL_PRIMARY_FOREGROUND_DEFAULT CONTROL_PRIMARY_FOREGROUND_ACTIVE BADGE_TEXT_DEFAULT
    CHECKBOX_ICON_SELECTED SWITCH_ICON_SELECTED RADIO_ICON_SELECTED
    CONTROL_EXPRESSIVE_FOREGROUND_DEFAULT CONTROL_EXPRESSIVE_FOREGROUND_ACTIVE
    BUTTON_FILLED_BRAND_TEXT BUTTON_FILLED_BRAND_TEXT_HOVER BUTTON_FILLED_BRAND_TEXT_ACTIVE
    CONTROL_SECONDARY_FOREGROUND_DEFAULT CONTROL_SECONDARY_FOREGROUND_ACTIVE
    CONTROL_SECONDARY_FOREGROUND_HOVER BUTTON_FILLED_SECONDARY_TEXT CONTROL_PRIMARY_FOREGROUND_HOVER
    CONTROL_PRIMARY_TEXT_HOVER CONTROL_EXPRESSIVE_FOREGROUND_HOVER TEXT_ON_ACCENT
    CONTROL_OVERLAY_PRIMARY_FOREGROUND_DEFAULT`);
  assign("border", `
    APP_FRAME_BORDER BORDER_MUTED BORDER_SUBTLE BORDER_NORMAL BORDER_STRONG BORDER_FAINT
    BORDER_DEFAULT CARD_BORDER_DEFAULT CHAT_BORDER REACTION_BORDER_DEFAULT CHECKBOX_BORDER_DEFAULT
    CHECKBOX_BORDER_SELECTED_DEFAULT CONTROL_OVERLAY_PRIMARY_BORDER_DEFAULT
    CONTROL_OVERLAY_SECONDARY_BORDER_DEFAULT CONTROL_SECONDARY_BORDER_DEFAULT
    CONTROL_SECONDARY_BORDER_ACTIVE CONTROL_PRIMARY_BORDER_DEFAULT CONTROL_PRIMARY_BORDER_ACTIVE
    INPUT_BORDER_DEFAULT INPUT_BORDER_ACTIVE INPUT_BORDER_FOCUSED MOBILE_CHATINPUT_BORDER_DEFAULT
    MOBILE_CHATINPUT_BORDER_ACTIVE MOBILE_COACHMARK_BORDER_DEFAULT MOBILE_COMMAND_BAR_DIVIDER
    MOBILE_FLOATING_ACCESSORY_BORDER MOBILE_HEADER_BORDER STANDALONE_CHANNEL_HEADER_BORDER
    RADIO_BORDER_DEFAULT SWITCH_BORDER_DEFAULT SWITCH_BORDER_SELECTED_DEFAULT
    REDESIGN_BUTTON_SECONDARY_BORDER REDESIGN_BUTTON_PRIMARY_BORDER BUTTON_OUTLINE_BRAND_BOARDER
    DIVIDER_COLOR SEPARATOR_COLOR BORDER_FOCUSED BORDER_ACTIVE INPUT_BORDER_HOVER
    MOBILE_CHATINPUT_BORDER_FOCUSED REDESIGN_BUTTON_SECONDARY_HOVER_BORDER BORDER_CHANNEL_HEADER
    MOBILE_BOTTOM_NAV_BORDER MOBILE_BOTTOM_NAVIGATION_BORDER DIVIDER_SUBTLE`);

  // Interpolate around the wheel. Separate brightness ranges keep labels readable on fills.
  const wheel = [[255,48,72], [255,151,25], [247,221,20], [44,218,102],
    [14,219,220], [52,122,255], [159,72,255], [249,56,183]];
  function mix(a, b, weight) {
    return a.map((v, i) => v + (b[i] - v) * weight);
  }
  const black = [0, 0, 0], white = [255, 255, 255];
  const rgbOf = hex => hex.slice(1).match(/../g).map(s => parseInt(s, 16));
  const hexOf = rgb => "#" + rgb.map(n => Math.round(n).toString(16).padStart(2, "0")).join("");
  function luminance(rgb) {
    const linear = rgb.map(n => n / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  function readableLabel(fill, candidate) {
    const a = luminance(fill), b = luminance(candidate);
    if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5) return candidate;
    return a > 0.179 ? black : white;
  }
  function frameColor(area, phase, s) {
    const key = area.key;
    if (!s.rgb) return rgbOf(s[key]);
    if (key === "background") return black;
    const pulse = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
    const position = ((phase + (s.effect === "wave" ? area.offset : 0)) % 1) * wheel.length;
    const i = Math.floor(position);
    const hue = mix(wheel[i], wheel[(i + 1) % wheel.length], position - i);
    const ranges = { buttons: [10, 102], text: [104, 255] };
    const [low, high] = ranges[key];
    const rgb = hue.map(v => low + (high - low) * v / 255);
    if (s.effect === "pulse") return mix(rgb, key === "text" ? white : [96, 96, 96], 0.50 * pulse);
    return s.effect === "chroma" ? mix(rgb, black, (key === "text" ? 0.15 : 0.35) * pulse) : rgb;
  }
  function paletteAt(phase, s) {
    const [surface, fill, text] = areas.map(area => frameColor(area, phase, s));
    const shade = mix(surface, fill, 0.52);
    const label = mix(text, white, 0.68);
    return {
      surface: hexOf(surface), text: hexOf(text), muted: hexOf(mix(text, surface, 0.12)),
      fill: hexOf(fill), shade: hexOf(shade), border: hexOf(mix(text, fill, 0.58)),
      label: hexOf(readableLabel(fill, label)), secondaryLabel: hexOf(readableLabel(shade, label)),
    };
  }
  for (const [name, role] of tokenRole) {
    if (role === "label" && /SECONDARY|TERTIARY/.test(name)) tokenRole.set(name, "secondaryLabel");
  }

  // Tokens added by Discord should pick up the effect even before they have an explicit entry.
  const rgbRoles = new Map();
  function rgbRole(name) {
    if (rgbRoles.has(name)) return rgbRoles.get(name);
    const known = tokenRole.get(name);
    const control = /BUTTON|CONTROL|SWITCH|RADIO|CHECKBOX|BADGE|REACTION|SLIDER|PROGRESS|CHIP|PILL/.test(name);
    const background = /BACKGROUND|BACKDROP|SCRIM|SURFACE|(?:^|_)BG(?:_|$)/.test(name);
    let role;
    if (/SPOILER.*HIDDEN/.test(name)) role = "surface";
    else if (/BORDER|OUTLINE|DIVIDER|SEPARATOR|STROKE/.test(name)) role = known || "border";
    else if (!known && /FOREGROUND|TEXT_ON_|ICON_ON_/.test(name)) role = control ? "label" : "text";
    else if (control && background) role = known === "shade" || /SECONDARY|TERTIARY/.test(name) ? "shade" : "fill";
    else if (known === "surface" || (background && known !== "fill" && !control)) role = "surface";
    else if (known) role = known;
    else if (control && /TEXT|LABEL|ICON/.test(name)) role = /SECONDARY|TERTIARY/.test(name) ? "secondaryLabel" : "label";
    else if (/MUTED|SUBTLE|DISABLED|PLACEHOLDER/.test(name)) role = "muted";
    else role = "text";
    rgbRoles.set(name, role);
    return role;
  }

  function keepAlpha(color, original) {
    if (original === "transparent") return original;
    if (typeof original !== "string") return color;
    if (/^#[0-9a-f]{8}$/i.test(original)) return color + original.slice(-2);
    if (/^#[0-9a-f]{4}$/i.test(original)) return color + original.slice(-1).repeat(2);
    const rgba = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/i.exec(original);
    if (rgba) return color + Math.round(Math.min(1, Number(rgba[1])) * 255).toString(16).padStart(2, "0");
    return color;
  }

  // Some icons read RawColor directly. Keep writes from other themes underneath the RGB layer.
  function patchRawColors(raw, getPalette) {
    const restore = [];
    for (const name of Object.keys(raw || {})) {
      const neutral = /^(?:OPACITY_)?(?:PRIMARY|PLUM|NEUTRAL)_/.test(name);
      if (!neutral && !/^(?:OPACITY_)?(BRAND|BLURPLE|RED|ORANGE|YELLOW|GREEN|BLUE|PURPLE|PINK|FUCHSIA|TEAL|CYAN|GOLD|STATUS)(_|$)/.test(name)) continue;
      const desc = Object.getOwnPropertyDescriptor(raw, name);
      if (!desc?.configurable || !desc.writable || typeof desc.value !== "string") continue;
      function tone(value) {
        if (typeof value !== "string") return null;
        const match = /^#([a-f0-9]{6})(?:[a-f0-9]{2})?$/i.exec(value);
        if (!match) return neutral ? null : "text";
        const light = luminance(rgbOf("#" + match[1]));
        if (neutral) return light <= 0.16 ? "surface" : light < 0.46 ? "muted" : "text";
        return light < 0.04 ? "shade" : light < 0.14 ? "fill" : light < 0.28 ? "border" : "text";
      }
      let base = desc.value, role = tone(base);
      const get = () => {
        const colors = getPalette();
        return colors && role ? keepAlpha(colors[role], base) : base;
      };
      Object.defineProperty(raw, name, { enumerable: desc.enumerable, configurable: true,
        get, set(value) { base = value; role = tone(value); } });
      restore.push(() => {
        if (Object.getOwnPropertyDescriptor(raw, name)?.get === get)
          Object.defineProperty(raw, name, { ...desc, value: base });
      });
    }
    return () => { for (const remove of restore) remove(); };
  }

  function makeSession() {
    const listeners = new Set();
    const undo = [];
    let options = readSettings(), phase = 0, version = 1;
    let palette = paletteAt(phase, options);
    let running = false, stopped = false;
    let foreground = false, reduceMotion = true, timer = null, lastTime;
    function notify() {
      version++;
      for (const listener of listeners) listener();
    }
    function tick() {
      const now = Date.now();
      phase = (phase + Math.max(0, now - lastTime) / durations[options.speed]) % 1;
      lastTime = now;
      palette = paletteAt(phase, options);
      notify();
    }
    function schedule() {
      const animate = options.rgb && running && !stopped && foreground && !reduceMotion && !options.paused && listeners.size > 0;
      if (animate && timer === null) {
        lastTime = Date.now();
        timer = setInterval(tick, 250);
      } else if (!animate && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function subscribe(listener) {
      if (stopped) return () => {};
      listeners.add(listener);
      schedule();
      return () => { listeners.delete(listener); schedule(); };
    }
    const snapshot = () => version;
    const find = valenced.modules.finders;
    const withProps = find.filters.withProps;
    const seen = new WeakSet();
    undo.push(find.getModules(withProps("RawColor", "SemanticColor"), tokens => {
      const internal = tokens.default?.internal;
      if (stopped || !internal?.resolveSemanticColor || !internal.getSemanticColorName || seen.has(internal)) return;
      seen.add(internal);
      undo.push(patchRawColors(tokens.RawColor, () => !stopped && options.rgb ? palette : null));
      undo.push(valenced.patcher.instead(internal, "resolveSemanticColor", (args, original) => {
        if (!stopped && args[1] != null) {
          const name = internal.getSemanticColorName(args[1]);
          if (typeof name === "string" && name.length) {
            if (options.rgb) {
              const role = rgbRole(name);
              if (role === "surface" && !/SCRIM|OVERLAY|TRANSPAREN/.test(name)) return palette.surface;
              return keepAlpha(palette[role], Reflect.apply(original, internal, args));
            }
            const role = !args[2]?.isProfileTheme && tokenRole.get(name);
            if (role) return palette[role];
          }
        }
        return Reflect.apply(original, internal, args);
      }, { priority: 100 }));
      notify();
    }, { cached: true }));

    undo.push(find.getModules(withProps("RootThemeContextProvider", "DisableCustomTheme"), mod => {
      const Original = mod.RootThemeContextProvider;
      if (stopped || typeof Original !== "function" || seen.has(mod)) return;
      seen.add(mod);
      // A separate component owns these hooks. Discord's hook order and child keys stay stable.
      function RgbRoot(props) {
        const React = valenced.react.React;
        const frame = React.useSyncExternalStore(subscribe, snapshot);
        const source = props.enabledExperiments;
        const experiments = React.useMemo(() => stopped ? source :
          [...(source || []), "mydiscordstuff-rgb:" + frame], [source, frame]);
        return React.createElement(Original, { ...props, enabledExperiments: experiments });
      }
      mod.RootThemeContextProvider = RgbRoot;
      undo.push(() => {
        if (mod.RootThemeContextProvider === RgbRoot) mod.RootThemeContextProvider = Original;
      });
    }, { cached: true }));

    return {
      subscribe, getPalette: () => palette,
      start({ jsonStorage, logger }) {
        const { AccessibilityInfo, AppState } = valenced.react.ReactNative;
        function settings() {
          if (stopped) return;
          options = readSettings(jsonStorage.cache);
          palette = paletteAt(phase, options);
          notify();
          schedule();
        }
        undo.push(jsonStorage.subscribe(settings));
        settings();
        if (!jsonStorage.loaded) jsonStorage.get().then(settings).catch(e => logger.warn(e));
        foreground = AppState.currentState === "active";
        const stateSub = AppState.addEventListener("change", state => {
          foreground = state === "active"; schedule();
        });
        undo.push(() => stateSub.remove());
        let motionEvent = false;
        const motionSub = AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
          motionEvent = true; reduceMotion = value; schedule();
        });
        undo.push(() => motionSub.remove());
        AccessibilityInfo.isReduceMotionEnabled().then(value => {
          if (!motionEvent && !stopped) { reduceMotion = value; schedule(); }
        }).catch(e => logger.warn(e));
        running = true;
        schedule();
      },
      stop() {
        stopped = true;
        schedule();
        try {
          for (const remove of undo.reverse()) remove();
        } finally {
          notify();
          listeners.clear();
        }
      },
    };
  }

  const swatches = ["#000000", "#191926", "#ffffff", "#9e173d", "#ed6840", "#e5bf48",
    "#27ae74", "#37cbd1", "#487be8", "#8255d6", "#c644ae", "#f59dbb"];
  const card = { backgroundColor: "#17171e", borderRadius: 12, padding: 14, gap: 10 };
  const ink = { color: "#f5f4ff", fontSize: 16 };
  const hint = { color: "#c8c5d6", fontSize: 14 };
  function Choice({ title, selected, onPress, colors }) {
    const { React, ReactNative: N } = valenced.react;
    return React.createElement(N.Pressable, { onPress, accessibilityRole: "radio",
      accessibilityState: { checked: selected }, style: { paddingHorizontal: 12, minHeight: 44,
        justifyContent: "center", backgroundColor: selected ? colors.fill : colors.shade, borderRadius: 8 } },
      React.createElement(N.Text, { style: { ...ink, color: selected ? colors.label : colors.secondaryLabel } }, title));
  }

  function ColorEditor({ area, options, save }) {
    const { React, ReactNative: N } = valenced.react;
    const h = React.createElement;
    const { key, title } = area, current = options[key];
    const [open, setOpen] = React.useState(false);
    const [draft, setDraft] = React.useState(current);
    React.useEffect(() => { setDraft(current); }, [current]);
    const hex = canonicalHex(draft);
    function apply(color) {
      setDraft(color);
      save({ [key]: color });
    }
    return h(N.View, { style: card },
      h(N.Pressable, { accessibilityRole: "button", accessibilityState: { expanded: open },
        onPress: () => setOpen(!open), style: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 } },
        h(N.View, { style: { width: 29, height: 29, borderRadius: 15, borderWidth: 1,
          borderColor: "#b0adbd", backgroundColor: current } }),
        h(N.View, { style: { flex: 1 } }, h(N.Text, { style: ink }, title),
          h(N.Text, { style: hint }, current.toUpperCase())),
        h(N.Text, { style: hint }, open ? "Fechar" : "Editar")),
      open && h(N.View, { style: { gap: 10 } },
        h(N.Text, { style: hint }, "Selecione uma cor ou digite seu código HEX."),
        h(N.View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 4 } },
          ...swatches.map(color => h(N.Pressable, { key: color, accessibilityRole: "button",
            accessibilityLabel: title + " " + color, accessibilityState: { selected: current === color },
            onPress: () => apply(color), style: { width: 44, height: 44, alignItems: "center", justifyContent: "center" } },
            h(N.View, { style: { width: 32, height: 32, borderRadius: 16, backgroundColor: color,
              borderWidth: current === color ? 3 : 1, borderColor: current === color ? "#ffffff" : "#868390" } })))),
        h(N.TextInput, { accessibilityLabel: "Código HEX para " + title.toLowerCase(), value: draft, onChangeText: setDraft,
          autoCapitalize: "none", autoCorrect: false, maxLength: 8, placeholder: "#8255D6", placeholderTextColor: "#aba7b6",
          onSubmitEditing: () => { if (hex) apply(hex); },
          style: { ...ink, backgroundColor: "#26242e", borderRadius: 8, paddingHorizontal: 12, minHeight: 44 } }),
        h(N.Pressable, { accessibilityRole: "button", disabled: !hex, accessibilityState: { disabled: !hex },
          onPress: () => apply(hex), style: { padding: 12, borderRadius: 8, backgroundColor: hex ? "#634b96" : "#38363f" } },
          h(N.Text, { style: ink }, hex ? "Aplicar " + hex.toUpperCase() : "Digite 3 ou 6 dígitos hexadecimais"))));
  }

  const editorPalette = { surface: "#17171e", text: "#f5f4ff", muted: "#c8c5d6", border: "#575361",
    fill: "#634b96", shade: "#2d2b35", label: "#ffffff", secondaryLabel: "#f5f4ff" };
  const idleSubscribe = () => () => {};
  const idlePalette = () => editorPalette;
  let pendingSave = Promise.resolve();
  function SettingsComponent({ api }) {
    const { React, ReactNative: N } = valenced.react;
    const h = React.createElement;
    const options = readSettings(api.jsonStorage.use());
    const live = React.useSyncExternalStore(session?.subscribe || idleSubscribe, session?.getPalette || idlePalette);
    const colors = options.rgb ? live : editorPalette;
    const panel = { ...card, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 };
    const bodyStyle = { ...ink, color: colors.text }, hintStyle = { ...hint, color: colors.muted };
    const [picker, setPicker] = React.useState(null);
    function save(change) {
      pendingSave = pendingSave.then(() => api.jsonStorage.set(change)).catch(e => api.logger?.warn?.(e));
    }
    function choices(key, title, items) {
      const open = picker === key;
      return h(N.View, { style: panel },
        h(N.Pressable, { accessibilityRole: "button", accessibilityState: { expanded: open },
          onPress: () => setPicker(open ? null : key), style: { justifyContent: "center", minHeight: 44 } },
          h(N.Text, { style: hintStyle }, title), h(N.Text, { style: bodyStyle }, items[options[key]] + "  ▾")),
        open && h(N.View, { style: { flexDirection: "row", flexWrap: "wrap", gap: 6 } },
          ...Object.entries(items).map(([id, name]) => h(Choice, { key: id, title: name, colors,
            selected: options[key] === id, onPress: () => { save({ [key]: id }); setPicker(null); } }))));
    }
    const speeds = Object.fromEntries(Object.entries(durations).map(([id, ms]) => [id, ms / 1000 + " s"]));
    return h(N.View, { style: { padding: 12, gap: 8 } },
      toggle("Tema RGB", options.rgb, rgb => { setPicker(null); save(rgb ? { rgb, paused: false } : { rgb }); }),
      options.rgb && choices("effect", "Efeito", effects),
      options.rgb && choices("speed", "Duração do ciclo", speeds),
      options.rgb && toggle("Pausar animação", options.paused, paused => save({ paused })),
      ...(!options.rgb ? areas.map(area => h(ColorEditor, { key: area.key, area, options, save })) : []));
    function toggle(label, value, onValueChange) {
      return h(N.View, { style: { ...panel, flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
        h(N.Text, { style: bodyStyle }, label),
        h(N.Switch, { accessibilityLabel: label, value, onValueChange,
          trackColor: { false: colors.shade, true: colors.fill }, thumbColor: colors.text }));
    }
  }

  let session;
  return plugin({
    jsonStorage: { default: defaults },
    preInit({ cleanup, plugin: self }) {
      session = makeSession();
      const current = session;
      cleanup(() => { current.stop(); if (session === current) session = undefined; });
      if (self.startedLate) self.requireReload();
    },
    start(api) { session.start(api); },
    SettingsComponent,
  });
})() })
