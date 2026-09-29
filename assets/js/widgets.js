/* MoonQwak — interactive figures and labs.
   Every widget is declared in the page by a data attribute and built here. Canvas colours are
   read from the CSS tokens at draw time, so they follow the light/dark theme. */
(function () {
  "use strict";

  var MQ = window.MQ || {};
  var U = MQ.util;
  if (!U) return;
  var L = U.L, bi = U.bi, esc = U.esc;
  var root = document.documentElement;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var uid = 0;
  function nextId(p) { uid++; return "mq-" + p + "-" + uid; }
  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  var C = {};
  function refreshColors() {
    ["--ink", "--ink-2", "--ink-3", "--rule", "--rule-2", "--accent", "--accent-ink", "--info", "--good", "--crit",
      "--canvas-bg", "--panel", "--panel-2", "--bg", "--series-1", "--series-2", "--series-3", "--series-4", "--grid", "--axis", "--warn"]
      .forEach(function (k) { C[k.slice(2)] = css(k); });
  }
  refreshColors();

  var redrawers = [];
  function onRedraw(fn) { redrawers.push(fn); }
  document.addEventListener("mq:theme", function () {
    // The attribute changes synchronously; styles resolve on the next read.
    setTimeout(function () { refreshColors(); redrawers.forEach(function (f) { f(); }); }, 0);
  });
  document.addEventListener("mq:lang", function () { redrawers.forEach(function (f) { f(); }); });

  /* ---------------------------------------------------------------- helpers */
  function frame(host, titleEn, titleFr, subEn, subFr) {
    host.classList.add("lab");
    host.innerHTML = '<div class="lab-head"><span class="lab-title">' + bi(titleEn, titleFr) + '</span><span class="lab-sub">' +
      bi(subEn, subFr) + '</span></div><div class="lab-body"></div>';
    return host.querySelector(".lab-body");
  }
  function slider(parent, key, en, fr, min, max, step, value, fmt) {
    var id = nextId(key);
    var wrap = document.createElement("div");
    wrap.className = "ctl";
    wrap.innerHTML = '<label for="' + id + '">' + bi(en, fr) + '<output for="' + id + '"></output></label>' +
      '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">';
    parent.appendChild(wrap);
    var input = wrap.querySelector("input"), out = wrap.querySelector("output");
    function show() { out.textContent = fmt ? fmt(parseFloat(input.value)) : input.value; }
    input.addEventListener("input", show);
    show();
    return { input: input, get value() { return parseFloat(input.value); }, set value(v) { input.value = v; show(); }, refresh: show };
  }
  function toggleGroup(parent, key, options, current, onChange) {
    // options: [{v, en, fr}] rendered as pressed buttons (single choice)
    var wrap = document.createElement("div");
    wrap.className = "btn-row";
    wrap.setAttribute("role", "group");
    options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.setAttribute("data-v", o.v);
      b.innerHTML = bi(o.en, o.fr);
      b.setAttribute("aria-pressed", String(o.v === current));
      b.addEventListener("click", function () {
        wrap.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onChange(o.v);
      });
      wrap.appendChild(b);
    });
    parent.appendChild(wrap);
    return wrap;
  }
  function readouts(parent, defs) {
    var wrap = document.createElement("div");
    wrap.className = "readouts";
    var map = {};
    defs.forEach(function (d) {
      var r = document.createElement("div");
      r.className = "readout" + (d.hot ? " hot" : "");
      r.innerHTML = "<b>" + bi(d.en, d.fr) + "</b><span>–</span>";
      wrap.appendChild(r);
      map[d.k] = { box: r, span: r.querySelector("span") };
    });
    parent.appendChild(wrap);
    return {
      set: function (k, text, state) {
        var m = map[k]; if (!m) return;
        m.span.textContent = text;
        m.box.classList.toggle("bad", state === "bad");
      }
    };
  }
  function makeCanvas(parent, w, h, label) {
    var cv = document.createElement("canvas");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", label);
    parent.appendChild(cv);
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv: cv, ctx: ctx, w: w, h: h,
      toLocal: function (clientX, clientY) {
        var r = cv.getBoundingClientRect();
        return { x: (clientX - r.left) * (w / r.width), y: (clientY - r.top) * (h / r.height) };
      } };
  }
  function playButton(parent, anim) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "btn";
    function show() { b.innerHTML = anim.running ? bi("Pause", "Pause") : bi("Play", "Lecture"); }
    b.addEventListener("click", function () { anim.running = !anim.running; show(); });
    parent.appendChild(b);
    show();
    return { refresh: show };
  }
  function text(ctx, s, x, y, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || 500) + " " + (opts.size || 12) + "px " + (opts.mono ? css("--font-mono") : css("--font-body"));
    ctx.fillStyle = opts.color || C["ink-2"];
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.base || "alphabetic";
    ctx.fillText(s, x, y);
  }
  function fmt(n, d) {
    var l = U.lang() === "fr" ? "fr-FR" : "en-US";
    return Number(n).toLocaleString(l, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }

  /* ---------------------------------------------------------- animation loop */
  var anims = [];
  var rafId = 0, lastT = 0;
  function loop(t) {
    var dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0;
    lastT = t;
    var any = false;
    anims.forEach(function (a) {
      if (a.visible && a.running) { a.step(dt); a.draw(); any = true; }
    });
    rafId = requestAnimationFrame(loop);
    void any;
  }
  function addAnim(a, el) {
    a.visible = true;
    anims.push(a);
    if ("IntersectionObserver" in window) {
      a.visible = false;
      var io = new IntersectionObserver(function (en) { en.forEach(function (e) { a.visible = e.isIntersecting; if (a.visible) a.draw(); }); });
      io.observe(el);
    }
    if (!rafId) rafId = requestAnimationFrame(loop);
    onRedraw(function () { a.draw(); });
    a.draw();
  }

  /* ============================================================ 1. FLOW MAPS */
  // <svg data-flow> ... <path data-flow-path data-flow-class="alt" data-flow-rate="1.2" data-flow-speed="90" .../>
  function initFlow(svg) {
    var paths = [].slice.call(svg.querySelectorAll("[data-flow-path]"));
    if (!paths.length) return;
    var ns = "http://www.w3.org/2000/svg";
    var layer = document.createElementNS(ns, "g");
    layer.setAttribute("class", "flow-layer");
    svg.appendChild(layer);
    var lanes = paths.map(function (p, i) {
      var len = p.getTotalLength();
      return { p: p, len: len, rate: parseFloat(p.getAttribute("data-flow-rate") || "0.8"),
        speed: parseFloat(p.getAttribute("data-flow-speed") || "110"), cls: p.getAttribute("data-flow-class") || "",
        acc: (i * 0.37) % 1, dots: [] };
    });
    if (reduced) {
      lanes.forEach(function (ln) {
        var pt = ln.p.getPointAtLength(ln.len * 0.55);
        var c = document.createElementNS(ns, "circle");
        c.setAttribute("r", "3.4"); c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y);
        c.setAttribute("class", "flow-dot " + ln.cls);
        layer.appendChild(c);
      });
      return;
    }
    var anim = {
      running: true,
      step: function (dt) {
        lanes.forEach(function (ln) {
          ln.acc += dt * ln.rate;
          while (ln.acc >= 1) {
            ln.acc -= 1;
            var c = document.createElementNS(ns, "circle");
            c.setAttribute("r", "3.4");
            c.setAttribute("class", "flow-dot " + ln.cls);
            layer.appendChild(c);
            ln.dots.push({ c: c, d: 0 });
          }
          for (var i = ln.dots.length - 1; i >= 0; i--) {
            var dot = ln.dots[i];
            dot.d += dt * ln.speed;
            if (dot.d >= ln.len) { layer.removeChild(dot.c); ln.dots.splice(i, 1); continue; }
            var pt = ln.p.getPointAtLength(dot.d);
            dot.c.setAttribute("cx", pt.x.toFixed(1));
            dot.c.setAttribute("cy", pt.y.toFixed(1));
          }
        });
      },
      draw: function () {}
    };
    addAnim(anim, svg);
  }

  /* ============================================================== 2. STEPPER */
  // <div data-stepper> <svg> ...<g data-step="1">... </svg> <ol class="steps"><li>…</li></ol> </div>
  function initStepper(host) {
    var steps = [].slice.call(host.querySelectorAll("ol.steps > li"));
    var marks = [].slice.call(host.querySelectorAll("[data-step]"));
    var n = steps.length;
    if (!n) return;
    host.classList.add("stepper");
    var cur = 1, timer = null;
    var bar = document.createElement("div");
    bar.className = "btn-row";
    bar.style.justifyContent = "space-between";
    bar.innerHTML = '<div class="btn-row"><button type="button" class="btn" data-a="prev">← ' + bi("Back", "Retour") + '</button>' +
      '<button type="button" class="btn primary" data-a="next">' + bi("Next step", "Étape suivante") + ' →</button>' +
      '<button type="button" class="btn" data-a="play">' + bi("Play all", "Tout jouer") + '</button></div><span class="step-count"></span>';
    var txt = document.createElement("div");
    txt.className = "step-text";
    txt.setAttribute("aria-live", "polite");
    var body = host.querySelector(".lab-body") || host;
    body.appendChild(txt);
    body.appendChild(bar);
    function render() {
      marks.forEach(function (m) {
        var s = parseInt(m.getAttribute("data-step"), 10);
        m.classList.toggle("future", s > cur);
        m.classList.toggle("current", s === cur);
      });
      txt.innerHTML = steps[cur - 1].innerHTML;
      bar.querySelector(".step-count").textContent = L("Step ", "Étape ") + cur + " / " + n;
      bar.querySelector('[data-a="prev"]').disabled = cur === 1;
      bar.querySelector('[data-a="next"]').disabled = cur === n;
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; bar.querySelector('[data-a="play"]').innerHTML = bi("Play all", "Tout jouer"); } }
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "prev" && cur > 1) { stop(); cur--; render(); }
      if (a === "next" && cur < n) { stop(); cur++; render(); }
      if (a === "play") {
        if (timer) { stop(); return; }
        if (cur === n) cur = 1;
        render();
        b.innerHTML = bi("Stop", "Arrêter");
        timer = setInterval(function () { if (cur >= n) { stop(); return; } cur++; render(); }, 2600);
      }
    });
    render();
    document.addEventListener("mq:lang", render);
  }

  /* ========================================================== 3. BYTE STRIPS */
  function initBytes(host) {
    var legend = host.querySelector(".byte-legend");
    if (!legend) return;
    var base = legend.innerHTML;
    host.querySelectorAll(".byte-field").forEach(function (f) {
      f.setAttribute("tabindex", "0");
      var show = function () {
        host.querySelectorAll(".byte-field").forEach(function (x) { x.classList.remove("hot"); });
        f.classList.add("hot");
        legend.innerHTML = bi(f.getAttribute("data-en") || "", f.getAttribute("data-fr") || "");
      };
      f.addEventListener("mouseenter", show);
      f.addEventListener("focus", show);
    });
    host.addEventListener("mouseleave", function () {
      host.querySelectorAll(".byte-field").forEach(function (x) { x.classList.remove("hot"); });
      legend.innerHTML = base;
    });
  }

  /* =========================================================== 4. VARINT LAB */
  // Mirrors Network/VarInt.EncodeUVarInt byte for byte (big-endian, size prefix in the top bits).
  function encodeUVarInt(v) {
    v = BigInt.asUintN(64, v);
    var out = [], i;
    if (v < 0x7fn) return [Number(v)];
    if (v < 0x3fffn) { var a = v | 0x8000n; return [Number(a >> 8n), Number(a & 0xffn)]; }
    if (v < 0x1fffffffn) { var b = v | 0xc0000000n; for (i = 3; i >= 0; i--) out.push(Number((b >> BigInt(8 * i)) & 0xffn)); return out; }
    if (v < 0x0fffffffffffffffn) { var c = v | 0xe000000000000000n; for (i = 7; i >= 0; i--) out.push(Number((c >> BigInt(8 * i)) & 0xffn)); return out; }
    out.push(0xff);
    for (i = 7; i >= 0; i--) out.push(Number((v >> BigInt(8 * i)) & 0xffn));
    return out;
  }
  function zigzag(n) { return n >= 0n ? n * 2n : (-n) * 2n - 1n; }
  function roundHalfEven(x) {
    // .NET Math.Round(double) rounds half to even; mirror it so the lab matches the server.
    var f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }
  function initVarint(host) {
    var b = frame(host, "Varint lab", "Labo varint", "The project's own encoder, byte for byte.", "L'encodeur du projet, octet pour octet.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var idVal = nextId("vi"), idMode = nextId("vm");
    var ctlVal = document.createElement("div"); ctlVal.className = "ctl"; ctlVal.style.minWidth = "13rem";
    ctlVal.innerHTML = '<label for="' + idVal + '">' + bi("Value", "Valeur") + '</label><input id="' + idVal + '" type="text" inputmode="decimal" value="16383">';
    controls.appendChild(ctlVal);
    var ctlMode = document.createElement("div"); ctlMode.className = "ctl"; ctlMode.style.minWidth = "16rem";
    ctlMode.innerHTML = '<label for="' + idMode + '">' + bi("Encoding", "Encodage") + '</label><select id="' + idMode + '"></select>';
    controls.appendChild(ctlMode);
    var sel = ctlMode.querySelector("select");
    var modes = [
      { v: "u", en: "Unsigned varint", fr: "Varint non signé" },
      { v: "s", en: "Signed: zig-zag + varint", fr: "Signé : zig-zag + varint" },
      { v: "p", en: "Ship position ×40 (2.5 cm)", fr: "Position de coque ×40 (2,5 cm)" },
      { v: "v", en: "Velocity ×100 (1 cm/s)", fr: "Vitesse ×100 (1 cm/s)" },
      { v: "b", en: "Bullet position ×10", fr: "Position de balle ×10" }
    ];
    function fillModes() {
      var cur = sel.value || "u";
      sel.innerHTML = modes.map(function (m) { return '<option value="' + m.v + '">' + esc(L(m.en, m.fr)) + "</option>"; }).join("");
      sel.value = cur;
    }
    fillModes();
    var presets = document.createElement("div"); presets.className = "btn-row";
    [["126", "u"], ["127", "u"], ["16382", "u"], ["16383", "u"], ["-1", "s"], ["163.8", "p"], ["409", "p"], ["120.5", "v"]].forEach(function (p) {
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "btn"; bt.textContent = p[0] + (p[1] === "u" ? "" : " · " + p[1]);
      bt.addEventListener("click", function () { ctlVal.querySelector("input").value = p[0]; sel.value = p[1]; update(); });
      presets.appendChild(bt);
    });
    b.appendChild(presets);
    var bytesBox = document.createElement("div"); bytesBox.className = "bytes"; b.appendChild(bytesBox);
    var note = document.createElement("p"); note.className = "byte-legend"; note.style.margin = "0"; b.appendChild(note);
    var chartHost = document.createElement("div"); chartHost.className = "chart"; b.appendChild(chartHost);
    var ro = readouts(b, [
      { k: "size", en: "Bytes on the wire", fr: "Octets sur le fil", hot: true },
      { k: "raw", en: "Integer encoded", fr: "Entier encodé" },
      { k: "fixed", en: "vs fixed width", fr: "vs taille fixe" },
      { k: "err", en: "Decoding error", fr: "Erreur au décodage" }
    ]);
    var inp = ctlVal.querySelector("input");
    inp.addEventListener("input", update);
    sel.addEventListener("change", update);

    function update() {
      var mode = sel.value;
      var raw = inp.value.trim().replace(",", ".");
      var num = Number(raw);
      var ok = raw !== "" && isFinite(num);
      var bytes = [], encoded = 0n, err = null, fixedBytes = 8, label = "";
      if (ok) {
        try {
          if (mode === "u") {
            if (num < 0 || !/^\d+$/.test(raw)) { ok = false; }
            else { encoded = BigInt(raw); fixedBytes = encoded > 0xffffffffn ? 8 : 4; }
          } else if (mode === "s") {
            if (!/^-?\d+$/.test(raw)) ok = false; else { encoded = zigzag(BigInt(raw)); fixedBytes = 8; }
          } else {
            var scale = mode === "p" ? 40 : mode === "v" ? 100 : 10;
            var q = roundHalfEven(num * scale);
            encoded = zigzag(BigInt(q));
            err = Math.abs(q / scale - num);
            fixedBytes = 8;
            label = q + " = round(" + num + " × " + scale + ")";
          }
        } catch (e) { ok = false; }
      }
      if (!ok) {
        bytesBox.innerHTML = "";
        note.innerHTML = bi("Type a whole number for the integer encodings, any number for the quantized ones.",
          "Tapez un entier pour les encodages entiers, n'importe quel nombre pour les quantifiés.");
        ro.set("size", "–"); ro.set("raw", "–"); ro.set("fixed", "–"); ro.set("err", "–");
        drawChart(null);
        return;
      }
      bytes = encodeUVarInt(encoded);
      var n = bytes.length;
      var prefixBits = n === 1 ? 1 : n === 2 ? 2 : n === 4 ? 3 : n === 8 ? 4 : 8;
      bytesBox.innerHTML = bytes.map(function (by, i) {
        var bin = by.toString(2); while (bin.length < 8) bin = "0" + bin;
        var shown = i === 0 ? '<span style="color:var(--accent-ink)">' + bin.slice(0, prefixBits) + "</span>" + bin.slice(prefixBits) : bin;
        return '<div class="byte-field' + (i === 0 ? " hot" : "") + '"><b>' + (i === 0 ? L("prefix byte", "octet préfixe") : L("byte ", "octet ") + (i + 1)) +
          '</b><span>0x' + (by < 16 ? "0" : "") + by.toString(16).toUpperCase() + '</span><span style="font-size:0.72rem;color:var(--ink-3)">' + shown + "</span></div>";
      }).join("");
      var ranges = { 1: "0 – 126", 2: "127 – 16 382", 4: "16 383 – 536 870 910", 8: "536 870 911 – 2⁶⁰−2", 9: "≥ 2⁶⁰−1" };
      note.innerHTML = bi("The highlighted bits of the first byte tell the reader how many bytes follow. This size holds " + ranges[n] + ".",
        "Les bits en surbrillance du premier octet disent au lecteur combien d'octets suivent. Cette taille couvre " + ranges[n] + ".") +
        (label ? " <code>" + esc(label) + "</code>" : "");
      ro.set("size", n + (n === 1 ? L(" byte", " octet") : L(" bytes", " octets")));
      ro.set("raw", encoded.toString());
      ro.set("fixed", L((fixedBytes - n >= 0 ? "saves " : "costs ") + Math.abs(fixedBytes - n) + " of " + fixedBytes,
        (fixedBytes - n >= 0 ? "économise " : "coûte ") + Math.abs(fixedBytes - n) + " sur " + fixedBytes));
      ro.set("err", err == null ? L("exact", "exact") : (err * 100).toFixed(2) + " cm");
      drawChart(encoded);
    }

    // Size vs value, log scale: the cliffs are the whole story.
    function drawChart(v) {
      var W = 720, H = 150, ml = 44, mr = 14, mt = 14, mb = 30;
      var maxLog = 19;
      function x(lg) { return ml + (W - ml - mr) * lg / maxLog; }
      var sizes = [1, 2, 4, 8, 9];
      function y(s) { return mt + (H - mt - mb) * (1 - s / 9); }
      var bounds = [[0, 126, 1], [127, 16382, 2], [16383, 536870910, 4], [536870911, 1.15e18, 8], [1.15e18, 1e19, 9]];
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(L("Encoded size by value, log scale", "Taille encodée selon la valeur, échelle log")) + '">';
      sizes.forEach(function (sz) {
        s += '<line class="grid-line" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(sz) + '" y2="' + y(sz) + '"/>';
        s += '<text class="tick-label" x="' + (ml - 8) + '" y="' + (y(sz) + 4) + '" text-anchor="end">' + sz + " B</text>";
      });
      [0, 3, 6, 9, 12, 15, 18].forEach(function (lg) {
        s += '<text class="tick-label" x="' + x(lg) + '" y="' + (H - 10) + '" text-anchor="middle">10' + (lg ? "<tspan dy='-5' font-size='8'>" + lg + "</tspan>" : "⁰") + "</text>";
      });
      var d = "";
      bounds.forEach(function (bd, i) {
        var x0 = x(Math.log10(bd[0] + 1)), x1 = x(Math.log10(bd[1] + 1));
        d += (i === 0 ? "M" : "L") + x0.toFixed(1) + " " + y(bd[2]).toFixed(1) + " L" + x1.toFixed(1) + " " + y(bd[2]).toFixed(1) + " ";
      });
      s += '<path d="' + d + '" fill="none" style="stroke:var(--series-1)" stroke-width="2" stroke-linejoin="round"/>';
      if (v != null) {
        var n = encodeUVarInt(v).length;
        var lx = x(Math.min(maxLog, Math.log10(Number(v) + 1)));
        s += '<circle cx="' + lx.toFixed(1) + '" cy="' + y(n).toFixed(1) + '" r="5.5" style="fill:var(--accent);stroke:var(--panel)" stroke-width="2"/>';
        s += '<text class="val-label" x="' + Math.min(W - 60, lx + 8).toFixed(1) + '" y="' + (y(n) - 9).toFixed(1) + '">' + esc(L("you are here", "vous êtes ici")) + "</text>";
      }
      s += "</svg>";
      chartHost.innerHTML = s;
    }
    update();
    onRedraw(function () { fillModes(); update(); });
  }

  /* ============================================================ 5. DRIFT LAB */
  function initDrift(host) {
    var b = frame(host, "Tick scheduling lab", "Labo de cadence du tick",
      "A 25 Hz loop (40 ms budget) under three scheduling strategies.", "Une boucle à 25 Hz (budget 40 ms) sous trois stratégies d'ordonnancement.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var cost = slider(controls, "cost", "Work per tick", "Travail par tick", 0, 35, 1, 12, function (v) { return v + " ms"; });
    var timerSel = { v: "coarse" };
    var tg = document.createElement("div"); tg.className = "ctl"; tg.style.minWidth = "18rem";
    tg.innerHTML = "<label>" + bi("OS sleep resolution", "Résolution du sommeil de l'OS") + "</label>";
    controls.appendChild(tg);
    toggleGroup(tg, "tres", [
      { v: "coarse", en: "15.6 ms (default)", fr: "15,6 ms (défaut)" },
      { v: "fine", en: "1 ms (timeBeginPeriod)", fr: "1 ms (timeBeginPeriod)" }
    ], "coarse", function (v) { timerSel.v = v; draw(); });
    var spikeBox = document.createElement("div"); spikeBox.className = "ctl";
    spikeBox.innerHTML = "<label>" + bi("One slow tick (120 ms)", "Un tick lent (120 ms)") + "</label>";
    controls.appendChild(spikeBox);
    var spike = { v: false };
    toggleGroup(spikeBox, "spk", [{ v: "off", en: "Off", fr: "Non" }, { v: "on", en: "On", fr: "Oui" }], "off", function (v) { spike.v = v === "on"; draw(); });
    var cnv = makeCanvas(b, 760, 250, L("Tick times under three scheduling strategies", "Instants des ticks sous trois stratégies"));
    var ro = readouts(b, [
      { k: "a", en: "Re-arm after work", fr: "Réarmé après le travail" },
      { k: "b", en: "Anchored + Sleep", fr: "Ancré + Sleep" },
      { k: "c", en: "Anchored + precise timer", fr: "Ancré + minuterie précise", hot: true }
    ]);
    cost.input.addEventListener("input", draw);

    function rng(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
    function simulate(kind, Q, h0, withSpike) {
      var r = rng(7), I = 40, ticks = [], late = [], t = 0, due = 0, i = 0;
      function wakeCoarse(x) { return Math.ceil(x / Q - 1e-9) * Q; }
      while (t < 2000 && i < 400) {
        ticks.push(t); late.push(Math.max(0, t - due));
        var h = h0 + (r() * 2 - 1) * 1.5 + (withSpike && i === 12 ? 120 : 0);
        if (h < 0) h = 0;
        var now = t + h;
        if (kind === 0) {
          // The first version: a timer re-armed once the handler returned, so every tick
          // is interval + work + rounding late relative to the previous one.
          t = wakeCoarse(now + I);
          due = t;
        } else {
          due += I;
          if (due < now - 250) due = now + I;            // too far behind: resume from now
          var thr = kind === 1 ? 2 : 0.5;
          var guard = 0;
          while (guard++ < 50) {
            var rem = due - now;
            if (rem > thr) {
              var w = Math.min(rem - thr, 15);
              now = kind === 1 ? wakeCoarse(now + w) : now + w + r() * 0.5;
              continue;
            }
            if (rem > 0) now = due;                       // spin the last fraction
            break;
          }
          t = now;
        }
        i++;
      }
      return { ticks: ticks, late: late };
    }
    function stats(sim) {
      var inWin = sim.ticks.filter(function (t) { return t < 2000; }).length;
      var worst = 0; sim.late.forEach(function (x) { if (x > worst) worst = x; });
      return { tps: inWin / 2, worst: worst };
    }
    function draw() {
      var ctx = cnv.ctx, W = cnv.w, H = cnv.h;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C["canvas-bg"]; ctx.fillRect(0, 0, W, H);
      var Q = timerSel.v === "coarse" ? 15.625 : 1;
      var sims = [simulate(0, Q, cost.value, spike.v), simulate(1, Q, cost.value, spike.v), simulate(2, Q, cost.value, spike.v)];
      var names = [L("Re-arm after the work", "Réarmé après le travail"), L("Anchored schedule + Sleep", "Échéance ancrée + Sleep"), L("Anchored + high-res timer + spin", "Ancré + minuterie haute résolution + spin")];
      var x0 = 16, x1 = W - 16, span = 1000; // show the first second
      function X(t) { return x0 + (x1 - x0) * t / span; }
      for (var row = 0; row < 3; row++) {
        var yTop = 22 + row * 76, yMid = yTop + 34;
        text(ctx, names[row], x0, yTop + 4, { size: 12, weight: 600, color: C.ink });
        ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, yMid); ctx.lineTo(x1, yMid); ctx.stroke();
        for (var k = 0; k <= 25; k++) {
          var gx = X(k * 40);
          ctx.strokeStyle = C["rule-2"]; ctx.beginPath(); ctx.moveTo(gx, yMid - 5); ctx.lineTo(gx, yMid + 5); ctx.stroke();
        }
        var sim = sims[row];
        sim.ticks.forEach(function (t, i) {
          if (t > span) return;
          var lateMs = sim.late[i];
          ctx.fillStyle = lateMs > 2 ? C.crit : (row === 2 ? C.accent : C["series-1"]);
          ctx.fillRect(X(t) - 1.5, yMid - 14, 3, 28);
          if (lateMs > 2) {
            ctx.strokeStyle = C.crit; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(X(t - lateMs), yMid + 18); ctx.lineTo(X(t), yMid + 18); ctx.stroke();
          }
        });
        var st = stats(sim);
        text(ctx, fmt(st.tps, 1) + " TPS", x1, yTop + 4, { size: 12, weight: 600, align: "right", mono: true, color: st.tps < 24.5 ? C.crit : C.ink });
      }
      text(ctx, L("0 ms", "0 ms"), x0, H - 6, { size: 10, mono: true, color: C["ink-3"] });
      text(ctx, L("1 s — grey ticks are the ideal 40 ms schedule, red marks show lateness", "1 s — traits gris : cadence idéale de 40 ms, marques rouges : retard"), x1, H - 6, { size: 10, align: "right", color: C["ink-3"] });
      [0, 1, 2].forEach(function (k) {
        var st = stats(sims[k]);
        ro.set(["a", "b", "c"][k], fmt(st.tps, 1) + " TPS · " + L("worst ", "pire ") + fmt(st.worst, 0) + " ms", st.tps < 24.5 ? "bad" : null);
      });
    }
    draw();
    onRedraw(draw);
  }

  /* =============================================================== 6. AOI LAB */
  function initAoi(host) {
    var b = frame(host, "Area of interest lab", "Labo de zone d'intérêt",
      "Drag the viewer. Compare the old 3×3 cell window with a radius query.", "Déplacez l'observateur. Comparez l'ancienne fenêtre 3×3 à une requête par rayon.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var r = slider(controls, "r", "View radius", "Rayon de vue", 30, 110, 1, 60, function (v) { return v + " u"; });
    var c = slider(controls, "c", "Cell size", "Taille de cellule", 8, 110, 1, 20, function (v) { return v + " u"; });
    var mode = { v: "radius" };
    var mg = document.createElement("div"); mg.className = "ctl"; mg.style.minWidth = "16rem";
    mg.innerHTML = "<label>" + bi("Query", "Requête") + "</label>"; controls.appendChild(mg);
    toggleGroup(mg, "aoim", [{ v: "radius", en: "Radius (new)", fr: "Rayon (nouveau)" }, { v: "cells", en: "3×3 cells (old)", fr: "3×3 cellules (ancien)" }], "radius", function (v) { mode.v = v; anim.draw(); });
    var cnv = makeCanvas(b, 760, 400, L("Objects around a viewer and the grid cells scanned", "Objets autour d'un observateur et cellules balayées"));
    var tools = document.createElement("div"); tools.className = "btn-row"; b.appendChild(tools);
    var ro = readouts(b, [
      { k: "cells", en: "Cells scanned", fr: "Cellules balayées" },
      { k: "tested", en: "Objects tested", fr: "Objets testés" },
      { k: "seen", en: "Objects visible", fr: "Objets visibles", hot: true },
      { k: "cost", en: "Est. query cost", fr: "Coût estimé" }
    ]);
    var WU = 400, HU = 210, S = 760 / WU; // world units → px
    var objs = [];
    var seed = 11; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    for (var i = 0; i < 170; i++) objs.push({ x: rnd() * WU, y: rnd() * HU, vx: (rnd() - 0.5) * 16, vy: (rnd() - 0.5) * 16 });
    var viewer = { x: WU * 0.5, y: HU * 0.5 };
    var dragging = false;
    cnv.cv.addEventListener("pointerdown", function (e) { dragging = true; cnv.cv.setPointerCapture(e.pointerId); move(e); });
    cnv.cv.addEventListener("pointermove", function (e) { if (dragging) move(e); });
    cnv.cv.addEventListener("pointerup", function () { dragging = false; });
    function move(e) { var p = cnv.toLocal(e.clientX, e.clientY); viewer.x = Math.max(0, Math.min(WU, p.x / S)); viewer.y = Math.max(0, Math.min(HU, p.y / S)); anim.draw(); }
    r.input.addEventListener("input", function () { anim.draw(); });
    c.input.addEventListener("input", function () { anim.draw(); });
    var anim = {
      running: !reduced,
      step: function (dt) {
        objs.forEach(function (o) {
          o.x += o.vx * dt; o.y += o.vy * dt;
          if (o.x < 0 || o.x > WU) o.vx *= -1;
          if (o.y < 0 || o.y > HU) o.vy *= -1;
        });
      },
      draw: function () {
        var ctx = cnv.ctx, R = r.value, CS = c.value;
        ctx.clearRect(0, 0, cnv.w, cnv.h);
        ctx.fillStyle = C["canvas-bg"]; ctx.fillRect(0, 0, cnv.w, cnv.h);
        var vcx = Math.floor(viewer.x / CS), vcy = Math.floor(viewer.y / CS);
        var reach = mode.v === "radius" ? Math.ceil(R / CS) : 1;
        // scanned cells
        ctx.fillStyle = C["panel-2"];
        for (var dx = -reach; dx <= reach; dx++) for (var dy = -reach; dy <= reach; dy++) {
          ctx.fillRect((vcx + dx) * CS * S, (vcy + dy) * CS * S, CS * S, CS * S);
        }
        // grid
        ctx.strokeStyle = C.rule; ctx.lineWidth = 1;
        ctx.beginPath();
        for (var gx = 0; gx <= WU; gx += CS) { ctx.moveTo(gx * S + 0.5, 0); ctx.lineTo(gx * S + 0.5, cnv.h); }
        for (var gy = 0; gy <= HU; gy += CS) { ctx.moveTo(0, gy * S + 0.5); ctx.lineTo(cnv.w, gy * S + 0.5); }
        ctx.stroke();
        // radius
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.setLineDash(mode.v === "radius" ? [] : [5, 5]);
        ctx.beginPath(); ctx.arc(viewer.x * S, viewer.y * S, R * S, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        var tested = 0, seen = 0;
        var cellsScanned = (2 * reach + 1) * (2 * reach + 1);
        objs.forEach(function (o) {
          var ocx = Math.floor(o.x / CS), ocy = Math.floor(o.y / CS);
          var inScan = Math.abs(ocx - vcx) <= reach && Math.abs(ocy - vcy) <= reach;
          var d = Math.hypot(o.x - viewer.x, o.y - viewer.y);
          var visible;
          if (mode.v === "radius") { if (inScan) tested++; visible = inScan && d <= R; }
          else { visible = inScan; if (inScan) tested++; }
          if (visible) seen++;
          ctx.beginPath(); ctx.arc(o.x * S, o.y * S, visible ? 4 : 3, 0, Math.PI * 2);
          ctx.fillStyle = visible ? C["series-1"] : (inScan ? C["ink-3"] : C["rule-2"]);
          ctx.fill();
        });
        // viewer
        ctx.beginPath(); ctx.arc(viewer.x * S, viewer.y * S, 7, 0, Math.PI * 2);
        ctx.fillStyle = C.accent; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C["canvas-bg"]; ctx.stroke();
        if (mode.v === "cells") text(ctx, L("Visible range depends on where you stand inside your cell", "La portée dépend de l'endroit où l'on se tient dans sa cellule"), 10, cnv.h - 10, { size: 11, color: C["ink-2"] });
        ro.set("cells", String(cellsScanned));
        ro.set("tested", String(tested));
        ro.set("seen", String(seen));
        var ns = cellsScanned * 20 + tested * 2;
        ro.set("cost", "≈ " + fmt(ns, 0) + " ns");
      }
    };
    playButton(tools, anim);
    var hint = document.createElement("span"); hint.className = "muted small";
    hint.innerHTML = bi("Cost model from the project notes: ~20 ns to read a cell, ~2 ns per distance test.", "Modèle de coût tiré des notes du projet : ~20 ns par cellule lue, ~2 ns par test de distance.");
    tools.appendChild(hint);
    addAnim(anim, host);
  }

  /* ======================================================== 7. BUDGET RINGS */
  function initBudget(host) {
    var b = frame(host, "Freshness budget lab", "Labo du budget de fraîcheur",
      "Each dot is a ship. Colour = how often this viewer receives it.", "Chaque point est un vaisseau. Couleur = à quelle fréquence cet observateur le reçoit.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var nS = slider(controls, "n", "Ships in view", "Vaisseaux en vue", 20, 400, 10, 200, function (v) { return v; });
    var nearS = slider(controls, "near", "NEAR (every tick)", "NEAR (chaque tick)", 5, 100, 5, 30, function (v) { return v; });
    var budS = slider(controls, "bud", "BUDGET (1 tick in 2)", "BUDGET (1 tick sur 2)", 10, 200, 5, 60, function (v) { return v; });
    var farS = slider(controls, "far", "FAR (1 tick in 4)", "FAR (1 tick sur 4)", 10, 400, 5, 120, function (v) { return v; });
    var slow = { v: false };
    var sg = document.createElement("div"); sg.className = "ctl";
    sg.innerHTML = "<label>" + bi("Speed", "Vitesse") + "</label>"; controls.appendChild(sg);
    toggleGroup(sg, "slow", [{ v: "rt", en: "Real time", fr: "Temps réel" }, { v: "slow", en: "Slow motion", fr: "Ralenti" }], "rt", function (v) { slow.v = v === "slow"; });
    var cnv = makeCanvas(b, 760, 380, L("Ships around a viewer coloured by update rate", "Vaisseaux autour d'un observateur colorés par fréquence de mise à jour"));
    var legend = document.createElement("div"); legend.className = "legend"; b.appendChild(legend);
    var ro = readouts(b, [
      { k: "sends", en: "Ships sent per tick", fr: "Vaisseaux envoyés / tick", hot: true },
      { k: "peer", en: "Per player (22 B each)", fr: "Par joueur (22 o chacun)" },
      { k: "all", en: "All players, outgoing", fr: "Tous joueurs, sortant" },
      { k: "frozen", en: "On heartbeat only", fr: "Au battement seul" }
    ]);
    var ships = [];
    function build() {
      ships = [];
      var n = nS.value, seed = 5;
      function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
      for (var i = 0; i < n; i++) {
        var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 175;
        ships.push({ id: i + 1, x: 380 + Math.cos(a) * rr * 1.95, y: 190 + Math.sin(a) * rr, d: rr, flash: 0, lastSent: -Math.floor(rnd() * 50) });
      }
      ships.sort(function (p, q) { return p.d - q.d; });
      ships.forEach(function (s, k) { s.rank = k; });
      sendHist = [];
    }
    build();
    nS.input.addEventListener("input", build);
    function clampRings() {
      if (budS.value < nearS.value) budS.value = nearS.value;
      if (farS.value < budS.value) farS.value = budS.value;
    }
    [nearS, budS, farS].forEach(function (s) { s.input.addEventListener("input", clampRings); });
    var tick = 0, acc = 0, sendHist = [];
    function rateOf(rank, near, bud, far) {
      if (rank < near) return 0;
      if (rank < bud) return 1;
      if (rank < far) return 2;
      return 3;
    }
    var anim = {
      running: !reduced,
      step: function (dt) {
        acc += dt * (slow.v ? 2 : 25);
        while (acc >= 1) {
          acc -= 1; tick++;
          var near = nearS.value, bud = budS.value, far = farS.value;
          var cap = (tick & 3) === 0 ? far : (tick & 3) === 2 ? bud : near;
          var sent = 0;
          ships.forEach(function (s) {
            var due = (tick - s.lastSent) >= 50; // 2 s heartbeat at 25 Hz
            if (s.rank < cap || due) { s.lastSent = tick; s.flash = 1; sent++; }
          });
          sendHist.push(sent); if (sendHist.length > 100) sendHist.shift();
        }
        ships.forEach(function (s) { s.flash = Math.max(0, s.flash - dt * (slow.v ? 2.5 : 9)); });
      },
      draw: function () {
        var ctx = cnv.ctx;
        ctx.clearRect(0, 0, cnv.w, cnv.h);
        ctx.fillStyle = C["canvas-bg"]; ctx.fillRect(0, 0, cnv.w, cnv.h);
        var near = nearS.value, bud = budS.value, far = farS.value;
        var cols = [C.accent, C["series-1"], C["series-3"], C["ink-3"]];
        ships.forEach(function (s) {
          var k = rateOf(s.rank, near, bud, far);
          ctx.beginPath(); ctx.arc(s.x, s.y, 3.2 + s.flash * 2.6, 0, Math.PI * 2);
          ctx.globalAlpha = k === 3 ? 0.55 : 0.55 + s.flash * 0.45;
          ctx.fillStyle = cols[k]; ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(380, 190, 7, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
        text(ctx, L("you", "vous"), 392, 186, { size: 11, weight: 600, color: C.ink });
        var avg = sendHist.length ? sendHist.reduce(function (a, v) { return a + v; }, 0) / sendHist.length : 0;
        var perPeer = avg * 22 * 25;
        ro.set("sends", fmt(avg, 1));
        ro.set("peer", fmt(perPeer / 1024, 1) + L(" KB/s", " Ko/s") + " · " + fmt(perPeer * 8 / 1000, 0) + " kbit/s");
        ro.set("all", fmt(perPeer * ships.length / 1048576, 2) + L(" MB/s", " Mo/s"));
        var frozen = ships.filter(function (s) { return s.rank >= far; }).length;
        ro.set("frozen", String(frozen), frozen > 0 && far === bud ? "bad" : null);
        legend.innerHTML =
          '<span><i style="background:' + cols[0] + '"></i>' + esc(L("25 Hz: nearest NEAR", "25 Hz : les NEAR plus proches")) + "</span>" +
          '<span><i style="background:' + cols[1] + '"></i>' + esc(L("12.5 Hz: up to BUDGET", "12,5 Hz : jusqu'à BUDGET")) + "</span>" +
          '<span><i style="background:' + cols[2] + '"></i>' + esc(L("6.25 Hz: up to FAR", "6,25 Hz : jusqu'à FAR")) + "</span>" +
          '<span><i style="background:' + cols[3] + '"></i>' + esc(L("0.5 Hz: heartbeat only (frozen)", "0,5 Hz : battement seul (gelé)")) + "</span>";
      }
    };
    var tools = document.createElement("div"); tools.className = "btn-row"; b.appendChild(tools);
    playButton(tools, anim);
    var twoRings = document.createElement("button"); twoRings.type = "button"; twoRings.className = "btn";
    twoRings.innerHTML = bi("Try the two-ring cliff (15 / 30 / 30)", "Essayer la falaise à deux anneaux (15 / 30 / 30)");
    twoRings.addEventListener("click", function () { nearS.value = 15; budS.value = 30; farS.value = 30; });
    tools.appendChild(twoRings);
    var def = document.createElement("button"); def.type = "button"; def.className = "btn";
    def.innerHTML = bi("Three rings (20 / 40 / 100)", "Trois anneaux (20 / 40 / 100)");
    def.addEventListener("click", function () { nearS.value = 20; budS.value = 40; farS.value = 100; });
    tools.appendChild(def);
    addAnim(anim, host);
  }

  /* ======================================================== 8. INTERPOLATION */
  function initInterp(host) {
    var b = frame(host, "Remote smoothing lab", "Labo de lissage distant",
      "A server sends positions at 25 Hz through a network you control.", "Un serveur envoie des positions à 25 Hz à travers un réseau que vous réglez.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var lat = slider(controls, "lat", "One-way latency", "Latence aller", 0, 250, 5, 60, function (v) { return v + " ms"; });
    var jit = slider(controls, "jit", "Jitter", "Gigue", 0, 60, 1, 15, function (v) { return "± " + v + " ms"; });
    var loss = slider(controls, "loss", "Packet loss", "Pertes", 0, 30, 1, 5, function (v) { return v + " %"; });
    var mode = { v: "interp" };
    var mg = document.createElement("div"); mg.className = "ctl"; mg.style.minWidth = "100%";
    mg.innerHTML = "<label>" + bi("Rendering strategy", "Stratégie de rendu") + "</label>"; controls.appendChild(mg);
    toggleGroup(mg, "im", [
      { v: "snap", en: "Snap to latest", fr: "Coller au dernier" },
      { v: "extra", en: "Extrapolate", fr: "Extrapoler" },
      { v: "damp", en: "Smooth toward extrapolation", fr: "Lisser vers l'extrapolation" },
      { v: "interp", en: "Buffered interpolation (100 ms)", fr: "Interpolation tamponnée (100 ms)" }
    ], "interp", function (v) { mode.v = v; });
    var cnv = makeCanvas(b, 760, 300, L("A remote ship rendered from delayed snapshots", "Un vaisseau distant rendu depuis des snapshots retardés"));
    var ro = readouts(b, [
      { k: "err", en: "Distance to true position", fr: "Écart à la vraie position", hot: true },
      { k: "jerk", en: "Jerkiness", fr: "À-coups" },
      { k: "age", en: "Newest sample age", fr: "Âge du dernier échantillon" }
    ]);
    function truePos(t) {
      return { x: 380 + Math.sin(t * 0.9) * 290, y: 150 + Math.sin(t * 1.7) * 100 };
    }
    var clock = 0, nextSend = 0, inflight = [], recv = [], render = { x: 380, y: 150 }, vel = { x: 0, y: 0 }, prevRender = null, jerkAcc = 0, jerkN = 0;
    var errAvg = 0;
    var seed = 3; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    var anim = {
      running: !reduced,
      step: function (dt) {
        clock += dt;
        while (clock >= nextSend) {
          var p = truePos(nextSend), q = truePos(nextSend + 0.001);
          var sample = { t: nextSend, x: p.x, y: p.y, vx: (q.x - p.x) / 0.001, vy: (q.y - p.y) / 0.001 };
          if (rnd() * 100 >= loss.value) {
            var delay = (lat.value + (rnd() * 2 - 1) * jit.value) / 1000;
            inflight.push({ at: nextSend + Math.max(0, delay), s: sample });
          }
          nextSend += 0.04;
        }
        for (var i = inflight.length - 1; i >= 0; i--) {
          if (inflight[i].at <= clock) { recv.push(inflight[i].s); inflight.splice(i, 1); }
        }
        recv.sort(function (a, b2) { return a.t - b2.t; });
        while (recv.length > 60) recv.shift();
        if (!recv.length) return;
        var last = recv[recv.length - 1];
        var target;
        if (mode.v === "snap") target = { x: last.x, y: last.y };
        else if (mode.v === "extra" || mode.v === "damp") {
          var age = Math.min(0.25, clock - last.t);
          target = { x: last.x + last.vx * age, y: last.y + last.vy * age };
        } else {
          var rt = clock - 0.1, a = null, bb = null;
          for (var k = 0; k < recv.length; k++) {
            if (recv[k].t <= rt) a = recv[k];
            if (recv[k].t > rt) { bb = recv[k]; break; }
          }
          if (a && bb) { var f = (rt - a.t) / (bb.t - a.t); target = { x: a.x + (bb.x - a.x) * f, y: a.y + (bb.y - a.y) * f }; }
          else if (a) target = { x: a.x + a.vx * Math.min(0.2, rt - a.t), y: a.y + a.vy * Math.min(0.2, rt - a.t) };
          else target = { x: recv[0].x, y: recv[0].y };
        }
        if (mode.v === "damp") {
          // critically damped spring toward the target (Unity's SmoothDamp, smoothTime ≈ 2 ticks)
          var st = 0.08, omega = 2 / st, x = omega * dt, exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
          ["x", "y"].forEach(function (ax) {
            var change = render[ax] - target[ax];
            var temp = (vel[ax] + omega * change) * dt;
            vel[ax] = (vel[ax] - omega * temp) * exp;
            render[ax] = target[ax] + (change + temp) * exp;
          });
        } else render = { x: target.x, y: target.y };
        if (prevRender) {
          var vx = (render.x - prevRender.x) / Math.max(dt, 1e-3), vy = (render.y - prevRender.y) / Math.max(dt, 1e-3);
          if (anim._pv) { jerkAcc += Math.hypot(vx - anim._pv.x, vy - anim._pv.y) * dt; jerkN += dt; }
          anim._pv = { x: vx, y: vy };
        }
        prevRender = { x: render.x, y: render.y };
        var tp = truePos(clock);
        errAvg = errAvg * 0.95 + Math.hypot(tp.x - render.x, tp.y - render.y) * 0.05;
        anim._age = clock - last.t;
      },
      draw: function () {
        var ctx = cnv.ctx;
        ctx.clearRect(0, 0, cnv.w, cnv.h);
        ctx.fillStyle = C["canvas-bg"]; ctx.fillRect(0, 0, cnv.w, cnv.h);
        ctx.strokeStyle = C.rule; ctx.lineWidth = 1; ctx.beginPath();
        for (var t = 0; t <= 7; t += 0.02) { var p = truePos(t); if (t === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
        ctx.stroke();
        recv.slice(-12).forEach(function (s) {
          ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2); ctx.fillStyle = C["series-1"]; ctx.fill();
        });
        var tp = truePos(clock);
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 9, 0, Math.PI * 2); ctx.strokeStyle = C["ink-3"]; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(render.x, render.y, 7, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = C["canvas-bg"]; ctx.stroke();
        text(ctx, L("dashed circle: where the ship really is · blue: snapshots received · amber: what the player sees", "cercle pointillé : où est vraiment le vaisseau · bleu : snapshots reçus · ambre : ce que voit le joueur"), 12, cnv.h - 12, { size: 11, color: C["ink-2"] });
        ro.set("err", fmt(errAvg, 1) + " px");
        var j = jerkN > 0 ? jerkAcc / jerkN : 0;
        ro.set("jerk", fmt(j / 100, 1), j > 900 ? "bad" : null);
        if (jerkN > 3) { jerkAcc *= 0.5; jerkN *= 0.5; }
        ro.set("age", anim._age != null ? fmt(anim._age * 1000, 0) + " ms" : "–");
      }
    };
    var tools = document.createElement("div"); tools.className = "btn-row"; b.appendChild(tools);
    playButton(tools, anim);
    addAnim(anim, host);
  }

  /* =========================================================== 9. PREDICTION */
  function initPredict(host) {
    var b = frame(host, "Prediction lab", "Labo de prédiction",
      "Hold the arrows (or use auto-walk). The server is authoritative; the grey patch slows you down on the server only.",
      "Maintenez les flèches (ou marche auto). Le serveur fait autorité ; la zone grise vous ralentit côté serveur uniquement.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var rtt = slider(controls, "rtt", "Round trip", "Aller-retour", 0, 400, 10, 160, function (v) { return v + " ms"; });
    var mode = { v: "recon" };
    var mg = document.createElement("div"); mg.className = "ctl"; mg.style.minWidth = "100%";
    mg.innerHTML = "<label>" + bi("Client strategy", "Stratégie du client") + "</label>"; controls.appendChild(mg);
    toggleGroup(mg, "pm", [
      { v: "none", en: "Wait for the server", fr: "Attendre le serveur" },
      { v: "naive", en: "Predict, snap on each update", fr: "Prédire, recoller à chaque mise à jour" },
      { v: "recon", en: "Predict + replay unacknowledged inputs", fr: "Prédire + rejouer les entrées non confirmées" }
    ], "recon", function (v) { mode.v = v; resetClient(); });
    var cnv = makeCanvas(b, 760, 190, L("A walking character predicted by the client and corrected by the server", "Un personnage prédit par le client et corrigé par le serveur"));
    var tools = document.createElement("div"); tools.className = "btn-row"; b.appendChild(tools);
    var ro = readouts(b, [
      { k: "lag", en: "Input to visible motion", fr: "Entrée → mouvement visible", hot: true },
      { k: "corr", en: "Last correction", fr: "Dernière correction" },
      { k: "pend", en: "Unacknowledged inputs", fr: "Entrées non confirmées" }
    ]);
    var SPEED = 150, TICK = 1 / 25, X0 = 60, X1 = 700;
    var mud = { a: 380, b: 470 };
    var held = 0, auto = !reduced;
    var sim = { t: 0, acc: 0, seq: 0 };
    var server = { x: X0, ack: 0 };
    var toServer = [], toClient = [];
    var client = { x: X0, shown: X0, pending: [], lastCorr: 0 };
    var lastInputAt = -1, lastMoveSeen = -1, lagShown = 0;
    function resetClient() { client.x = server.x; client.shown = server.x; client.pending = []; }
    function stepMove(x, dir, inMud) {
      var nx = x + dir * SPEED * TICK * (inMud ? 0.35 : 1);
      return Math.max(X0, Math.min(X1, nx));
    }
    function serverStep(x, dir) { return stepMove(x, dir, x >= mud.a && x <= mud.b); }
    function clientStep(x, dir) { return stepMove(x, dir, false); }
    var anim = {
      running: true,
      step: function (dt) {
        sim.t += dt; sim.acc += dt;
        while (sim.acc >= TICK) {
          sim.acc -= TICK;
          var dir = held;
          if (auto) { var ph = (sim.t % 6); dir = ph < 2.6 ? 1 : ph < 3 ? 0 : ph < 5.6 ? -1 : 0; }
          if (dir !== 0 && lastInputAt < 0) lastInputAt = sim.t;
          sim.seq++;
          var inp = { seq: sim.seq, dir: dir };
          toServer.push({ at: sim.t + rtt.value / 2000, i: inp });
          if (mode.v !== "none") {
            client.x = clientStep(client.x, dir);
            if (dir !== 0) client.pending.push(inp); else client.pending.push(inp);
          }
          // server consumes inputs that arrived
          for (var k = toServer.length - 1; k >= 0; k--) {
            if (toServer[k].at <= sim.t) {
              var m = toServer.splice(k, 1)[0];
              server.x = serverStep(server.x, m.i.dir);
              server.ack = m.i.seq;
              toClient.push({ at: sim.t + rtt.value / 2000, x: server.x, ack: server.ack });
            }
          }
          // client receives states
          for (var j = 0; j < toClient.length; j++) {
            var st = toClient[j];
            if (st.at > sim.t) continue;
            toClient.splice(j, 1); j--;
            if (mode.v === "none") { client.x = st.x; }
            else if (mode.v === "naive") {
              client.lastCorr = Math.abs(client.x - st.x);
              client.x = st.x;
              client.pending = client.pending.filter(function (p) { return p.seq > st.ack; });
            } else {
              client.pending = client.pending.filter(function (p) { return p.seq > st.ack; });
              var replay = st.x;
              client.pending.forEach(function (p) { replay = clientStep(replay, p.dir); });
              var corr = Math.abs(replay - client.x);
              if (corr > 0.5) client.lastCorr = corr;
              client.x = replay;
            }
          }
        }
        // render smoothing (like _renderWalk)
        client.shown += (client.x - client.shown) * Math.min(1, dt * 18);
        if (lastInputAt >= 0 && Math.abs(client.shown - (anim._startShown == null ? (anim._startShown = client.shown) : anim._startShown)) > 1.5) {
          lagShown = (sim.t - lastInputAt) * 1000; lastInputAt = -1; anim._startShown = null;
        }
        if (held === 0 && !auto) { lastInputAt = -1; anim._startShown = null; }
      },
      draw: function () {
        var ctx = cnv.ctx;
        ctx.clearRect(0, 0, cnv.w, cnv.h);
        ctx.fillStyle = C["canvas-bg"]; ctx.fillRect(0, 0, cnv.w, cnv.h);
        ctx.fillStyle = C["panel-2"]; ctx.fillRect(mud.a, 70, mud.b - mud.a, 60);
        text(ctx, L("server-only slow zone", "zone lente, côté serveur"), (mud.a + mud.b) / 2, 64, { size: 10.5, align: "center", color: C["ink-3"] });
        ctx.strokeStyle = C["rule-2"]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, 100); ctx.lineTo(X1, 100); ctx.stroke();
        ctx.beginPath(); ctx.arc(server.x, 100, 11, 0, Math.PI * 2); ctx.strokeStyle = C["ink-2"]; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(client.shown, 100, 8, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
        text(ctx, L("server (authoritative)", "serveur (fait autorité)"), server.x, 138, { size: 11, align: "center", color: C["ink-2"] });
        text(ctx, L("what the player sees", "ce que voit le joueur"), client.shown, 80, { size: 11, align: "center", color: C.ink, weight: 600 });
        text(ctx, L("inputs in flight: ", "entrées en vol : ") + toServer.length + " · " + L("states in flight: ", "états en vol : ") + toClient.length, 12, cnv.h - 12, { size: 11, color: C["ink-3"], mono: true });
        ro.set("lag", lagShown ? fmt(lagShown, 0) + " ms" : "–", lagShown > 120 ? "bad" : null);
        ro.set("corr", fmt(client.lastCorr, 1) + " px", client.lastCorr > 12 ? "bad" : null);
        ro.set("pend", String(client.pending.length));
      }
    };
    function holdBtn(label, dir) {
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "btn"; bt.innerHTML = label;
      var on = function (e) { e.preventDefault(); held = dir; auto = false; autoBtn.setAttribute("aria-pressed", "false"); };
      var off = function () { if (held === dir) held = 0; };
      bt.addEventListener("pointerdown", on); bt.addEventListener("pointerup", off); bt.addEventListener("pointerleave", off);
      tools.appendChild(bt);
    }
    holdBtn("◀", -1); holdBtn("▶", 1);
    var autoBtn = document.createElement("button"); autoBtn.type = "button"; autoBtn.className = "btn"; autoBtn.innerHTML = bi("Auto-walk", "Marche auto");
    autoBtn.setAttribute("aria-pressed", String(auto));
    autoBtn.addEventListener("click", function () { auto = !auto; held = 0; autoBtn.setAttribute("aria-pressed", String(auto)); });
    tools.appendChild(autoBtn);
    host.setAttribute("tabindex", "0");
    host.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { held = -1; auto = false; autoBtn.setAttribute("aria-pressed", "false"); e.preventDefault(); }
      if (e.key === "ArrowRight") { held = 1; auto = false; autoBtn.setAttribute("aria-pressed", "false"); e.preventDefault(); }
    });
    host.addEventListener("keyup", function (e) { if (e.key === "ArrowLeft" || e.key === "ArrowRight") held = 0; });
    addAnim(anim, host);
  }

  /* ===================================================== 10. SERIALIZE CALC */
  function initSerialize(host) {
    var b = frame(host, "Serialization cost calculator", "Calculateur du coût de sérialisation",
      "Work per tick for one map.", "Travail par tick pour une carte.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var P = slider(controls, "p", "Players watching", "Joueurs qui regardent", 1, 800, 1, 200, function (v) { return v; });
    var O = slider(controls, "o", "Objects on the map", "Objets sur la carte", 1, 800, 1, 400, function (v) { return v; });
    var V = slider(controls, "v", "Objects each player sees", "Objets vus par joueur", 1, 800, 1, 60, function (v) { return v; });
    var ro = readouts(b, [
      { k: "naive", en: "Serialize per viewer", fr: "Sérialiser par spectateur" },
      { k: "once", en: "Serialize once", fr: "Sérialiser une fois", hot: true },
      { k: "copies", en: "Byte copies (cheap)", fr: "Recopies d'octets (bon marché)" },
      { k: "ratio", en: "Serialization saved", fr: "Sérialisation évitée" }
    ]);
    var note = document.createElement("p"); note.className = "lab-foot"; note.style.padding = "0"; b.appendChild(note);
    function upd() {
      if (V.value > O.value) V.value = O.value;
      var p = P.value, o = O.value, v = V.value;
      var naive = p * v, once = o;
      ro.set("naive", fmt(naive) + L(" marshals", " marshals"));
      ro.set("once", fmt(once) + L(" marshals", " marshals"));
      ro.set("copies", fmt(naive));
      var ratio = naive / once;
      ro.set("ratio", ratio >= 1 ? "× " + fmt(ratio, 1) : L("loses (× ", "perd (× ") + fmt(ratio, 2) + ")", ratio < 1 ? "bad" : null);
      note.innerHTML = p < 2
        ? bi("With a single viewer, preparing every object can only lose: one player cannot see more objects than the map holds. The project skips preparation below two viewers (MinViewersToPrepare).",
          "Avec un seul spectateur, tout préparer ne peut que perdre : un joueur ne voit pas plus d'objets qu'il n'y en a. Le projet saute la préparation sous deux spectateurs (MinViewersToPrepare).")
        : bi("Preparation pays when the sum of what players see exceeds what the map holds.", "La préparation rapporte quand la somme de ce que voient les joueurs dépasse ce que contient la carte.");
    }
    [P, O, V].forEach(function (s) { s.input.addEventListener("input", upd); });
    upd();
    onRedraw(upd);
  }

  /* ========================================================= 11. FLEET CALC */
  function initFleet(host) {
    var b = frame(host, "Placement and capacity calculator", "Calculateur de placement et de capacité",
      "The gateway's two decisions, with its real formulas. Edit the servers.", "Les deux décisions de la gateway, avec ses vraies formules. Modifiez les serveurs.");
    var controls = document.createElement("div"); controls.className = "lab-controls"; b.appendChild(controls);
    var mapsPer = slider(controls, "mps", "MapsPerServer", "MapsPerServer", 10, 120, 5, 90, function (v) { return v; });
    var playersPer = slider(controls, "pps", "PlayersPerServer", "PlayersPerServer", 0, 400, 10, 200, function (v) { return v || L("off", "off"); });
    var waiting = slider(controls, "wait", "Maps waiting for a host", "Cartes en attente d'hôte", 0, 5, 1, 0, function (v) { return v; });
    var tableWrap = document.createElement("div"); tableWrap.className = "table-wrap"; b.appendChild(tableWrap);
    var servers = [
      { id: "BANC-01#0", maps: 30, players: 78, draining: false },
      { id: "BANC-01#1", maps: 31, players: 158, draining: false },
      { id: "BANC-02#0", maps: 30, players: 125, draining: false }
    ];
    var out = document.createElement("div"); out.className = "readouts"; b.appendChild(out);
    var addBtn = document.createElement("div"); addBtn.className = "btn-row"; b.appendChild(addBtn);
    var bAdd = document.createElement("button"); bAdd.className = "btn"; bAdd.type = "button"; bAdd.innerHTML = bi("Add a server", "Ajouter un serveur");
    bAdd.addEventListener("click", function () { if (servers.length < 6) { servers.push({ id: "BANC-0" + (servers.length + 1) + "#0", maps: 0, players: 0, draining: false }); render(); } });
    var bDel = document.createElement("button"); bDel.className = "btn"; bDel.type = "button"; bDel.innerHTML = bi("Remove last", "Retirer le dernier");
    bDel.addEventListener("click", function () { if (servers.length > 1) { servers.pop(); render(); } });
    addBtn.appendChild(bAdd); addBtn.appendChild(bDel);
    function score(s) {
      var sc = s.maps / Math.max(1, mapsPer.value);
      if (playersPer.value > 0) sc += s.players / playersPer.value;
      return sc;
    }
    function render() {
      var best = null, bestScore = Infinity, crowded = null, crowdedS = Infinity, condemned = null, condS = Infinity;
      servers.forEach(function (s) {
        var sc = score(s);
        if (s.draining) { if (sc < condS) { condS = sc; condemned = s; } return; }
        if (s.maps >= 110) { if (sc < crowdedS) { crowdedS = sc; crowded = s; } return; }
        if (sc < bestScore - 1e-9) { bestScore = sc; best = s; }
      });
      var pick = best || crowded || condemned;
      var html = "<table><thead><tr><th>" + esc(L("Server", "Serveur")) + '</th><th class="num">' + esc(L("Maps", "Cartes")) + '</th><th class="num">' + esc(L("Players", "Joueurs")) +
        "</th><th>" + esc(L("Draining", "En retrait")) + '</th><th class="num">' + esc(L("Score", "Score")) + "</th><th></th></tr></thead><tbody>";
      servers.forEach(function (s, i) {
        html += "<tr><td><code>" + esc(s.id) + '</code></td><td class="num"><input data-i="' + i + '" data-k="maps" type="number" min="0" max="130" value="' + s.maps + '" style="width:5rem"></td>' +
          '<td class="num"><input data-i="' + i + '" data-k="players" type="number" min="0" max="900" value="' + s.players + '" style="width:5rem"></td>' +
          '<td><input data-i="' + i + '" data-k="draining" type="checkbox"' + (s.draining ? " checked" : "") + ' aria-label="draining"></td>' +
          '<td class="num">' + score(s).toFixed(2) + "</td><td>" + (s === pick ? "<strong>" + esc(L("← next map goes here", "← la prochaine carte va ici")) + "</strong>" : (s.maps >= 110 ? esc(L("at ceiling", "au plafond")) : "")) + "</td></tr>";
      });
      html += "</tbody></table>";
      tableWrap.innerHTML = html;
      tableWrap.querySelectorAll("input").forEach(function (inp) {
        inp.addEventListener("change", function () {
          var s = servers[parseInt(inp.getAttribute("data-i"), 10)], k = inp.getAttribute("data-k");
          if (k === "draining") s.draining = inp.checked; else s[k] = Math.max(0, parseInt(inp.value || "0", 10));
          render();
        });
      });
      // capacity decision (Gateway.ComputeCapacity, simplified: no idle-server guard, Min 1, Max 8)
      var running = servers.length;
      var minMaps = Math.min.apply(null, servers.map(function (s) { return s.maps; }));
      var maxPlayers = Math.max.apply(null, servers.map(function (s) { return s.players; }));
      var totalMaps = servers.reduce(function (a, s) { return a + s.maps; }, 0);
      var totalPlayers = servers.reduce(function (a, s) { return a + s.players; }, 0);
      var full = minMaps >= mapsPer.value;
      var crowdedFlag = playersPer.value > 0 && maxPlayers >= playersPer.value;
      var needed = running, why;
      if (full || crowdedFlag) { needed = running + 1; why = full ? L("the emptiest server already holds " + minMaps + " maps", "le serveur le plus vide porte déjà " + minMaps + " cartes") : L("the busiest server carries " + maxPlayers + " players", "le serveur le plus peuplé porte " + maxPlayers + " joueurs"); }
      else if (running > 1) {
        var without = running - 1;
        var mapRoom = totalMaps / without < mapsPer.value * 0.8;
        var playerRoom = playersPer.value <= 0 || totalPlayers / without < playersPer.value * 0.8;
        if (waiting.value === 0 && mapRoom && playerRoom) { needed = without; why = L("everything would fit on one server fewer, with 20 % margin", "tout tiendrait sur un serveur de moins, avec 20 % de marge"); }
        else why = L("within thresholds, no surplus", "dans les seuils, pas de surplus");
      } else why = L("single server, within thresholds", "un seul serveur, dans les seuils");
      if (waiting.value > 0) { needed = Math.max(needed, running + 1); why = L(waiting.value + " map(s) found no host", waiting.value + " carte(s) sans hôte"); }
      var desired = Math.max(1, Math.min(8, needed));
      out.innerHTML = '<div class="readout hot"><b>' + esc(L("Desired servers", "Serveurs désirés")) + "</b><span>" + running + " → " + desired + "</span></div>" +
        '<div class="readout" style="grid-column: span 3"><b>' + esc(L("Why", "Pourquoi")) + "</b><span style=\"font-size:0.9rem;font-family:var(--font-body)\">" + esc(why) + "</span></div>";
    }
    [mapsPer, playersPer, waiting].forEach(function (s) { s.input.addEventListener("input", render); });
    render();
    onRedraw(render);
  }

  /* ========================================================= 12. PHASE TIMELINE */
  function initPhases(host) {
    var cfgEl = host.querySelector('script[type="application/json"]');
    if (!cfgEl) return;
    var cfg = JSON.parse(cfgEl.textContent);
    var plot = document.createElement("div"); plot.className = "chart";
    host.appendChild(plot);
    var tip = document.createElement("div"); tip.className = "chart-tip"; tip.hidden = true; plot.appendChild(tip);
    var W = 760, laneH = 34, top = 18, left = 132, right = 16;
    function render() {
      var l = U.lang();
      var H = top + cfg.lanes.length * (laneH + 12) + 34;
      var budget = cfg.budget;
      function X(ms) { return left + (W - left - right) * ms / budget; }
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(cfg.aria[l]) + '">';
      for (var ms = 0; ms <= budget; ms += 5) {
        s += '<line class="grid-line" x1="' + X(ms) + '" x2="' + X(ms) + '" y1="' + (top - 6) + '" y2="' + (H - 26) + '"/>';
        s += '<text class="tick-label" x="' + X(ms) + '" y="' + (H - 10) + '" text-anchor="middle">' + ms + (ms === budget ? " ms" : "") + "</text>";
      }
      cfg.lanes.forEach(function (lane, i) {
        var y = top + i * (laneH + 12);
        s += '<text class="cat-label" x="' + (left - 10) + '" y="' + (y + laneH / 2 + 4) + '" text-anchor="end">' + esc(lane.name[l]) + "</text>";
        lane.segs.forEach(function (sg, k) {
          var x0 = X(sg.s), w = Math.max(2, X(sg.s + sg.d) - x0 - 2);
          var fill = { accent: "var(--accent)", s1: "var(--series-1)", s2: "var(--series-2)", s3: "var(--series-3)", s4: "var(--series-4)", muted: "var(--rule-2)" }[sg.tone || "s1"];
          s += '<rect class="mark" data-l="' + i + '" data-k="' + k + '" x="' + x0.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="' + laneH + '" rx="4" style="fill:' + fill + '"/>';
          var ink = { s1: "var(--on-series-1)", muted: "var(--ink)" }[sg.tone || "s1"] || "var(--on-series)";
          if (w > sg.label[l].length * 6.2 + 12) s += '<text x="' + (x0 + 6).toFixed(1) + '" y="' + (y + laneH / 2 + 4) + '" style="font:600 10.5px var(--font-body);fill:' + ink + ';pointer-events:none">' + esc(sg.label[l]) + "</text>";
        });
      });
      s += '<line id="' + (host.id || "ph") + '-head" x1="' + X(0) + '" x2="' + X(0) + '" y1="' + (top - 8) + '" y2="' + (H - 26) + '" style="stroke:var(--ink)" stroke-width="1.5" opacity="0.6"/>';
      s += "</svg>";
      plot.innerHTML = s;
      plot.appendChild(tip);
      plot.querySelectorAll("rect.mark").forEach(function (r) {
        r.addEventListener("mousemove", function (e) {
          var sg = cfg.lanes[+r.getAttribute("data-l")].segs[+r.getAttribute("data-k")];
          tip.hidden = false;
          tip.innerHTML = "<b>" + esc(sg.label[l]) + " · " + sg.d.toFixed(1) + " ms</b>" + esc(sg.desc[l]);
          var box = plot.getBoundingClientRect();
          tip.style.left = (e.clientX - box.left) + "px"; tip.style.top = (e.clientY - box.top) + "px";
        });
        r.addEventListener("mouseleave", function () { tip.hidden = true; });
      });
      head = plot.querySelector("line[id$='-head']");
      Xf = X;
    }
    var head = null, Xf = null, t = 0;
    render();
    onRedraw(render);
    if (!reduced) {
      addAnim({ running: true, step: function (dt) { t = (t + dt * 1000 * 0.25) % cfg.budget; }, draw: function () {
        if (head && Xf) { var x = Xf(t); head.setAttribute("x1", x); head.setAttribute("x2", x); }
      } }, host);
    }
  }

  /* ================================================================ 13. CHARTS */
  function niceStep(max, count) {
    var raw = max / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }
  function initChart(host) {
    var cfgEl = host.querySelector('script[type="application/json"]');
    if (!cfgEl) return;
    var cfg = JSON.parse(cfgEl.textContent);
    host.classList.add("chart");
    var tools = document.createElement("div"); tools.className = "chart-tools"; host.appendChild(tools);
    var plot = document.createElement("div"); plot.style.position = "relative"; host.appendChild(plot);
    var tip = document.createElement("div"); tip.className = "chart-tip"; tip.hidden = true;
    var tableBox = document.createElement("div"); tableBox.className = "chart-table"; tableBox.hidden = true; host.appendChild(tableBox);
    var showTable = false;
    function cats(l) { return Array.isArray(cfg.cats) ? cfg.cats : cfg.cats[l]; }
    function val(v) { return v == null ? "–" : fmt(v, cfg.decimals || 0) + (cfg.unit ? " " + (typeof cfg.unit === "string" ? cfg.unit : cfg.unit[U.lang()]) : ""); }
    function render() {
      var l = U.lang();
      var cs = cats(l), series = cfg.series, nS = series.length;
      var legend = nS > 1 ? '<div class="legend">' + series.map(function (s, i) {
        return '<span><i style="background:var(--series-' + (i + 1) + ')"></i>' + esc(s.name[l]) + "</span>";
      }).join("") + "</div>" : "<span></span>";
      tools.innerHTML = legend + '<button type="button" class="btn" style="padding:0.35rem 0.6rem;font-size:0.76rem">' +
        (showTable ? bi("Hide table", "Masquer le tableau") : bi("Show as table", "Voir en tableau")) + "</button>";
      tools.querySelector("button").addEventListener("click", function () { showTable = !showTable; render(); });
      var max = cfg.max || 0;
      series.forEach(function (s) { s.values.forEach(function (v) { if (v != null && v > max) max = v; }); });
      var horizontal = cfg.type === "hbar";
      var W = 720, ml = horizontal ? (cfg.labelWidth || 200) : 52, mr = 22, mt = 18, mb = horizontal ? (cfg.unitLabel ? 46 : 30) : 46;
      var band = horizontal ? 34 : 0;
      var H = horizontal ? mt + cs.length * band + mb : (cfg.height || 260);
      var step = niceStep(max, 5), top = Math.ceil(max / step) * step || 1;
      var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(cfg.aria ? cfg.aria[l] : "") + '">';
      var hits = [];
      if (!horizontal) {
        var pw = W - ml - mr, ph = H - mt - mb, bw = pw / cs.length;
        var Y = function (v) { return mt + ph * (1 - v / top); };
        for (var g = 0; g <= top + 1e-9; g += step) {
          s += '<line class="grid-line" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(g).toFixed(1) + '" y2="' + Y(g).toFixed(1) + '"/>';
          s += '<text class="tick-label" x="' + (ml - 8) + '" y="' + (Y(g) + 4).toFixed(1) + '" text-anchor="end">' + fmt(g, step < 1 ? 1 : 0) + "</text>";
        }
        s += '<line class="axis-line" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
        cs.forEach(function (c, i) {
          var cx = ml + bw * (i + 0.5);
          var lines = String(c).split("\n");
          lines.forEach(function (ln, k) {
            s += '<text class="cat-label" x="' + cx.toFixed(1) + '" y="' + (H - mb + 18 + k * 14) + '" text-anchor="middle">' + esc(ln) + "</text>";
          });
          hits.push({ x: ml + bw * i, y: mt, w: bw, h: ph, i: i });
        });
        if (cfg.type === "line") {
          series.forEach(function (sr, si) {
            var d = "", lastPt = null;
            sr.values.forEach(function (v, i) {
              if (v == null) return;
              var x = ml + bw * (i + 0.5), y = Y(v);
              d += (d ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
              lastPt = { x: x, y: y, v: v };
            });
            s += '<path d="' + d + '" fill="none" style="stroke:var(--series-' + (si + 1) + ')" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
            sr.values.forEach(function (v, i) {
              if (v == null) return;
              s += '<circle cx="' + (ml + bw * (i + 0.5)).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="4" style="fill:var(--series-' + (si + 1) + ');stroke:var(--panel)" stroke-width="2"/>';
            });
            if (lastPt && cfg.endLabels !== false) s += '<text class="val-label" x="' + (lastPt.x + 8).toFixed(1) + '" y="' + (lastPt.y + 4).toFixed(1) + '">' + esc(val(lastPt.v)) + "</text>";
          });
        } else {
          var gap = 2, barW = Math.min(24, (bw * 0.62 - gap * (nS - 1)) / nS);
          var groupW = barW * nS + gap * (nS - 1);
          series.forEach(function (sr, si) {
            sr.values.forEach(function (v, i) {
              if (v == null) return;
              var x = ml + bw * (i + 0.5) - groupW / 2 + si * (barW + gap);
              var y = Y(v), y0 = Y(0), r = Math.min(4, barW / 2, y0 - y);
              var dPath = "M" + x.toFixed(1) + " " + y0.toFixed(1) + " V" + (y + r).toFixed(1) +
                " Q" + x.toFixed(1) + " " + y.toFixed(1) + " " + (x + r).toFixed(1) + " " + y.toFixed(1) +
                " H" + (x + barW - r).toFixed(1) + " Q" + (x + barW).toFixed(1) + " " + y.toFixed(1) + " " + (x + barW).toFixed(1) + " " + (y + r).toFixed(1) +
                " V" + y0.toFixed(1) + " Z";
              s += '<path class="mark" d="' + dPath + '" style="fill:var(--series-' + (si + 1) + ')"/>';
              if (cfg.valueLabels !== false && cs.length * nS <= 14) {
                s += '<text class="val-label" x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle">' + esc(fmt(v, cfg.decimals || 0)) + "</text>";
              }
            });
          });
        }
      } else {
        var pwh = W - ml - mr;
        var Xh = function (v) { return ml + pwh * v / top; };
        for (var gh = 0; gh <= top + 1e-9; gh += step) {
          s += '<line class="grid-line" x1="' + Xh(gh).toFixed(1) + '" x2="' + Xh(gh).toFixed(1) + '" y1="' + mt + '" y2="' + (H - mb) + '"/>';
          s += '<text class="tick-label" x="' + Xh(gh).toFixed(1) + '" y="' + (H - mb + 16) + '" text-anchor="middle">' + fmt(gh, step < 1 ? 1 : 0) + "</text>";
        }
        cs.forEach(function (c, i) {
          var y = mt + band * i;
          s += '<text class="cat-label" x="' + (ml - 10) + '" y="' + (y + band / 2 + 4) + '" text-anchor="end">' + esc(c) + "</text>";
          var bh = Math.min(20, (band - 10) / nS);
          series.forEach(function (sr, si) {
            var v = sr.values[i]; if (v == null) return;
            var by = y + (band - bh * nS - 2 * (nS - 1)) / 2 + si * (bh + 2);
            var x0 = Xh(0), x1 = Xh(v), r = Math.min(4, bh / 2, x1 - x0);
            var dPath = "M" + x0.toFixed(1) + " " + by.toFixed(1) + " H" + (x1 - r).toFixed(1) + " Q" + x1.toFixed(1) + " " + by.toFixed(1) + " " + x1.toFixed(1) + " " + (by + r).toFixed(1) +
              " V" + (by + bh - r).toFixed(1) + " Q" + x1.toFixed(1) + " " + (by + bh).toFixed(1) + " " + (x1 - r).toFixed(1) + " " + (by + bh).toFixed(1) + " H" + x0.toFixed(1) + " Z";
            s += '<path class="mark" d="' + dPath + '" style="fill:var(--series-' + (si + 1) + ')"/>';
            s += '<text class="val-label" x="' + (x1 + 6).toFixed(1) + '" y="' + (by + bh / 2 + 4).toFixed(1) + '">' + esc(fmt(v, cfg.decimals || 0)) + "</text>";
          });
          hits.push({ x: ml, y: y, w: pwh, h: band, i: i });
        });
        s += '<line class="axis-line" x1="' + ml + '" x2="' + ml + '" y1="' + mt + '" y2="' + (H - mb) + '"/>';
      }
      hits.forEach(function (hb) {
        s += '<rect class="hit" data-i="' + hb.i + '" x="' + hb.x.toFixed(1) + '" y="' + hb.y.toFixed(1) + '" width="' + hb.w.toFixed(1) + '" height="' + hb.h.toFixed(1) + '" fill="transparent"/>';
      });
      if (cfg.unitLabel) s += '<text class="tick-label" x="' + (horizontal ? W - mr : ml) + '" y="' + (horizontal ? H - 6 : 10) + '" text-anchor="' + (horizontal ? "end" : "start") + '">' + esc(cfg.unitLabel[l]) + "</text>";
      s += "</svg>";
      plot.innerHTML = s;
      plot.appendChild(tip);
      plot.querySelectorAll("rect.hit").forEach(function (r) {
        r.addEventListener("mousemove", function (e) {
          var i = +r.getAttribute("data-i");
          tip.hidden = false;
          tip.innerHTML = "<b>" + esc(String(cs[i]).replace("\n", " ")) + "</b>" + series.map(function (sr, si) {
            return '<div><i style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;background:var(--series-' + (si + 1) + ')"></i>' +
              (nS > 1 ? esc(sr.name[l]) + " : " : "") + esc(val(sr.values[i])) + "</div>";
          }).join("") + (cfg.notes && cfg.notes[l] && cfg.notes[l][i] ? '<div class="muted" style="margin-top:4px">' + esc(cfg.notes[l][i]) + "</div>" : "");
          var box = plot.getBoundingClientRect();
          tip.style.left = Math.max(80, Math.min(box.width - 80, e.clientX - box.left)) + "px";
          tip.style.top = (e.clientY - box.top) + "px";
        });
        r.addEventListener("mouseleave", function () { tip.hidden = true; });
      });
      tableBox.hidden = !showTable;
      if (showTable) {
        var t = '<div class="table-wrap"><table><thead><tr><th></th>' + series.map(function (sr) { return '<th class="num">' + esc(sr.name[l]) + "</th>"; }).join("") + "</tr></thead><tbody>";
        cs.forEach(function (c, i) {
          t += "<tr><td>" + esc(String(c).replace("\n", " ")) + "</td>" + series.map(function (sr) { return '<td class="num">' + esc(val(sr.values[i])) + "</td>"; }).join("") + "</tr>";
        });
        tableBox.innerHTML = t + "</tbody></table></div>";
      }
    }
    render();
    onRedraw(render);
  }

  /* ================================================================== boot */
  function boot() {
    document.querySelectorAll("svg[data-flow]").forEach(initFlow);
    document.querySelectorAll("[data-stepper]").forEach(initStepper);
    document.querySelectorAll("[data-bytes]").forEach(initBytes);
    var table = { varint: initVarint, drift: initDrift, aoi: initAoi, budget: initBudget, interp: initInterp,
      predict: initPredict, serialize: initSerialize, fleet: initFleet, phases: initPhases };
    document.querySelectorAll("[data-widget]").forEach(function (h) {
      var f = table[h.getAttribute("data-widget")];
      if (f) { try { f(h); } catch (e) { h.innerHTML = '<p class="muted">' + esc(L("This interactive figure failed to start: ", "Cette figure interactive n'a pas pu démarrer : ") + e.message) + "</p>"; } }
    });
    document.querySelectorAll("[data-chart]").forEach(function (h) {
      try { initChart(h); } catch (e) { h.innerHTML = '<p class="muted">' + esc(e.message) + "</p>"; }
    });
  }
  boot();
})();
