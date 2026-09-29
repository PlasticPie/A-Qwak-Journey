/* MoonQwak — page chrome and shared behaviour.
   Everything here reads MQ.data (site-data.js). No dependencies, works from file://. */
(function () {
  "use strict";

  var MQ = window.MQ = window.MQ || {};
  var D = MQ.data;
  var root = document.documentElement;
  var body = document.body;
  var pageId = body.getAttribute("data-page") || "";
  var chapter = D.chapters[pageId] || null;

  /* ------------------------------------------------------------------ utils */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  function lang() { return root.getAttribute("data-lang") === "fr" ? "fr" : "en"; }
  function L(en, fr) { return lang() === "fr" ? fr : en; }
  function tr(o) { return o ? (o[lang()] || o.en) : ""; }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Both languages inline, CSS hides the inactive one. Used for chrome that must not re-render.
  function bi(en, fr) { return '<span lang="en">' + esc(en) + '</span><span lang="fr">' + esc(fr) + "</span>"; }
  function biObj(o) { return bi(o.en, o.fr); }
  function visited() {
    try { return JSON.parse(store.get("mq-visited") || "[]"); } catch (e) { return []; }
  }
  function markVisited(id) {
    var v = visited();
    if (v.indexOf(id) < 0) { v.push(id); store.set("mq-visited", JSON.stringify(v)); }
  }
  MQ.util = { L: L, tr: tr, el: el, esc: esc, bi: bi, lang: lang, store: store };

  /* ------------------------------------------------------------ language */
  function updateTitle() {
    var name = D.site.name;
    var titleText = name;
    if (chapter) titleText = chapter[lang()].t + " · " + name;
    else {
      D.reference.forEach(function (r) {
        if (r.id === pageId && r.id !== "index") titleText = tr(r) + " · " + name;
      });
    }
    document.title = titleText;
  }
  function setLang(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l);
    store.set("mq-lang", l);
    updateTitle();
    document.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang-btn") === l));
    });
    document.dispatchEvent(new CustomEvent("mq:lang", { detail: l }));
  }
  MQ.setLang = setLang;

  /* --------------------------------------------------------------- theme */
  var THEMES = ["system", "light", "dark"];
  function themePref() { var t = store.get("mq-theme"); return THEMES.indexOf(t) >= 0 ? t : "system"; }
  function applyTheme(p) {
    if (p === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", p);
    store.set("mq-theme", p);
    var btn = document.getElementById("mq-theme-btn");
    if (btn) {
      btn.innerHTML = themeIcon(p);
      btn.setAttribute("aria-label", L("Theme: ", "Thème : ") + ({ system: L("system", "système"), light: L("light", "clair"), dark: L("dark", "sombre") })[p]);
      btn.title = btn.getAttribute("aria-label");
    }
    document.dispatchEvent(new CustomEvent("mq:theme", { detail: p }));
  }
  function themeIcon(p) {
    if (p === "light") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>';
    if (p === "dark") return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 17v3.5"/></svg>';
  }
  if (window.matchMedia) {
    var mm = window.matchMedia("(prefers-color-scheme: dark)");
    var onScheme = function () { document.dispatchEvent(new CustomEvent("mq:theme", { detail: themePref() })); };
    if (mm.addEventListener) mm.addEventListener("change", onScheme); else if (mm.addListener) mm.addListener(onScheme);
  }

  /* -------------------------------------------------------------- header */
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><mask id="mq-logo-cut"><rect width="32" height="32" fill="#fff"/><circle cx="19.8" cy="13.4" r="5.6" fill="#000"/></mask></defs>' +
    '<path d="M9.5 3.6h13L29 16l-6.5 12.4h-13L3 16z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle class="dg-accent" cx="16" cy="16" r="7.2" mask="url(#mq-logo-cut)"/></svg>';
  var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';

  function buildHeader() {
    var host = document.getElementById("mq-header");
    if (!host) return;
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
    var navItems = [
      { href: "start-here.html", id: "start-here", en: "Start here", fr: "Commencer" },
      { href: "topics.html", id: "topics", en: "Topics", fr: "Thèmes" },
      { href: "glossary.html", id: "glossary", en: "Glossary", fr: "Glossaire" },
      { href: "lessons.html", id: "lessons", en: "Rules of thumb", fr: "Règles d'or" },
      { href: "takeaways.html", id: "takeaways", en: "Key takeaways", fr: "À retenir" }
    ];
    var nav = navItems.map(function (n) {
      return '<a href="' + n.href + '"' + (n.id === pageId ? ' aria-current="page"' : "") + ">" + bi(n.en, n.fr) + "</a>";
    }).join("");
    host.innerHTML =
      '<div class="header-inner">' +
      '<button class="icon-btn menu-btn" id="mq-menu" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
      '<a class="wordmark" href="index.html">' + LOGO + "<span>" + esc(D.site.name) + "</span><small>" + biObj(D.site.tagline) + "</small></a>" +
      '<nav class="main-nav" aria-label="' + L("Main", "Principal") + '">' + nav + "</nav>" +
      '<div class="header-tools">' +
      '<button class="search-btn" id="mq-search-btn" type="button">' + SEARCH_ICON + '<span class="sb-text">' + bi("Search the notes", "Chercher dans les notes") + "</span><kbd>" + (isMac ? "⌘K" : "Ctrl K") + "</kbd></button>" +
      '<div class="seg" role="group" aria-label="Language / Langue"><button type="button" data-lang-btn="en" aria-pressed="false">EN</button><button type="button" data-lang-btn="fr" aria-pressed="false">FR</button></div>' +
      '<button class="icon-btn" id="mq-theme-btn" type="button"></button>' +
      "</div></div>";

    host.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.getAttribute("data-lang-btn")); });
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang-btn") === lang()));
    });
    document.getElementById("mq-theme-btn").addEventListener("click", function () {
      var next = THEMES[(THEMES.indexOf(themePref()) + 1) % THEMES.length];
      applyTheme(next);
    });
    document.getElementById("mq-search-btn").addEventListener("click", openSearch);
    var menu = document.getElementById("mq-menu");
    menu.addEventListener("click", function () { toggleDrawer(); });
    applyTheme(themePref());
  }

  function toggleDrawer(force) {
    var open = typeof force === "boolean" ? force : !body.classList.contains("drawer-open");
    body.classList.toggle("drawer-open", open);
    var m = document.getElementById("mq-menu");
    if (m) m.setAttribute("aria-expanded", String(open));
  }

  /* ------------------------------------------------------------- sidebar */
  function buildSidebar() {
    var host = document.getElementById("mq-sidebar");
    if (!host) return;
    var v = visited();
    var html = '<nav class="curriculum" aria-label="' + L("Curriculum", "Parcours") + '">';
    html += '<div class="curr-top">';
    [
      { href: "index.html", id: "index", en: "Home", fr: "Accueil" },
      { href: "topics.html", id: "topics", en: "Browse by topic", fr: "Parcourir par thème" },
      { href: "glossary.html", id: "glossary", en: "Glossary", fr: "Glossaire" },
      { href: "lessons.html", id: "lessons", en: "Rules of thumb", fr: "Règles d'or" },
      { href: "takeaways.html", id: "takeaways", en: "Key takeaways", fr: "À retenir" }
    ].forEach(function (r) {
      html += '<a href="' + r.href + '"' + (r.id === pageId ? ' aria-current="page"' : "") + ">" + bi(r.en, r.fr) + "</a>";
    });
    html += "</div>";
    D.parts.forEach(function (p) {
      var isCurrent = chapter && chapter.part === p.id;
      html += '<details class="curr-part"' + (isCurrent || !chapter ? " open" : "") + ">";
      html += '<summary><span class="pn">' + p.n + "</span>" + bi(p.en, p.fr) + '<span class="chev" aria-hidden="true">›</span></summary>';
      html += '<ol class="curr-chapters">';
      p.chapters.forEach(function (id) {
        var c = D.chapters[id];
        var cls = "curr-chapter" + (v.indexOf(id) >= 0 ? " visited" : "");
        html += '<li class="' + cls + '"><a href="' + c.file + '"' + (id === pageId ? ' aria-current="page"' : "") + ">" +
          '<span class="cn">' + c.n + "</span><span>" + bi(c.en.t, c.fr.t) + '</span><i class="visited-mark" aria-hidden="true"></i></a></li>';
      });
      html += "</ol></details>";
    });
    html += "</nav>";
    html += '<div class="sidebar-foot">' + bi("A green hexagon marks a chapter you finished. ", "Un hexagone vert marque un chapitre terminé. ") +
      '<button type="button" id="mq-reset-visited">' + bi("Reset", "Réinitialiser") + "</button></div>";
    host.innerHTML = html;
    var reset = document.getElementById("mq-reset-visited");
    if (reset) reset.addEventListener("click", function () {
      store.set("mq-visited", "[]");
      host.querySelectorAll(".visited").forEach(function (n) { n.classList.remove("visited"); });
      document.querySelectorAll(".stage-chapters a.visited").forEach(function (n) { n.classList.remove("visited"); });
    });
    var cur = host.querySelector('[aria-current="page"]');
    if (cur && cur.scrollIntoView && window.innerWidth > 920) {
      var top = cur.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.7) host.scrollTop = Math.max(0, top - window.innerHeight * 0.35);
    }
    var scrim = el("div", { class: "drawer-scrim" });
    scrim.addEventListener("click", function () { toggleDrawer(false); });
    body.appendChild(scrim);
  }

  /* ------------------------------------------------------- chapter chrome */
  function levelPips(n) {
    var s = '<span class="lvl" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) s += "<i" + (i <= n ? ' class="on"' : "") + "></i>";
    return s + "</span>";
  }
  MQ.levelPips = levelPips;

  function readingMinutes() {
    var prose = document.querySelector(".prose");
    if (!prose) return 0;
    var text = "";
    prose.querySelectorAll('[lang="' + lang() + '"]').forEach(function (n) { text += " " + n.textContent; });
    var words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(2, Math.round(words / 200));
  }

  function buildChapterHead() {
    if (!chapter) return;
    var part = D.parts.filter(function (p) { return p.id === chapter.part; })[0];
    var eb = document.querySelector(".eyebrow[data-auto]");
    if (eb) {
      eb.innerHTML = '<span class="pnum">' + bi("Part " + part.n, "Partie " + part.n) + "</span>" +
        '<span class="sep">/</span><span>' + bi(part.en, part.fr) + "</span>" +
        '<span class="sep">/</span><span>' + chapter.n + "</span>";
    }
    var meta = document.querySelector(".meta-row[data-auto]");
    if (meta) {
      var lv = D.levels[chapter.level];
      var cats = chapter.cats.map(function (c) {
        return '<a class="chip" href="topics.html#' + c + '">' + biObj(D.categories[c]) + "</a>";
      }).join("");
      meta.innerHTML =
        '<span class="meta-item">' + levelPips(chapter.level) + bi(lv.en, lv.fr) + "</span>" +
        '<span class="meta-item" id="mq-minutes"></span>' +
        '<span class="chips">' + cats + "</span>";
      var upd = function () {
        var m = readingMinutes();
        var mEl = document.getElementById("mq-minutes");
        if (mEl) mEl.textContent = L("≈ " + m + " min read", "≈ " + m + " min de lecture");
      };
      upd();
      document.addEventListener("mq:lang", upd);
    }
  }

  function buildMinimap() {
    if (!chapter) return "";
    var N = {
      launcher: [8, 14], update: [88, 14], monitor: [168, 14],
      client: [8, 64], gateway: [88, 64], gs: [168, 64],
      sim: [8, 124], db: [88, 124], agent: [168, 124]
    };
    var W = 66, H = 24;
    function c(id) { return [N[id][0] + W / 2, N[id][1] + H / 2]; }
    var edges = [["launcher", "update"], ["launcher", "client"], ["client", "gateway"], ["gateway", "gs"], ["gateway", "db"],
      ["gs", "db"], ["agent", "db"], ["agent", "gs"], ["sim", "db"], ["monitor", "gs"]];
    var hot = chapter.nodes || [];
    var s = '<svg viewBox="0 0 244 158" role="img" aria-label="' + esc(L("Where this chapter lives in the system", "Où ce chapitre se situe dans le système")) + '">';
    edges.forEach(function (e) {
      var a = c(e[0]), b = c(e[1]);
      var both = hot.indexOf(e[0]) >= 0 && hot.indexOf(e[1]) >= 0;
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" class="' + (both ? "dg-line-hot" : "dg-line") + '"/>';
    });
    // client <-> game server: the direct gameplay link, drawn under the gateway
    var ca = c("client"), cg = c("gs");
    var bothCG = hot.indexOf("client") >= 0 && hot.indexOf("gs") >= 0;
    s += '<path d="M' + ca[0] + " " + (ca[1] + 12) + " C " + ca[0] + " 108, " + cg[0] + " 108, " + cg[0] + " " + (cg[1] + 12) + '" class="' + (bothCG ? "dg-line-hot" : "dg-line") + ' dg-dash"/>';
    // Short labels: the rail is narrow, and French names run long.
    var SHORT = {
      launcher: ["Launcher", "Launcher"], update: ["Updates", "MAJ"], monitor: ["Monitor", "Monitor"],
      client: ["Client", "Client"], gateway: ["Gateway", "Gateway"], gs: ["Game srv", "Serv. jeu"],
      sim: ["World sim", "Simu"], db: ["Database", "Base"], agent: ["Agents", "Agents"]
    };
    Object.keys(N).forEach(function (id) {
      var on = hot.indexOf(id) >= 0;
      // An opaque base first: the highlight fill is translucent and lines must not show through.
      s += '<rect x="' + N[id][0] + '" y="' + N[id][1] + '" width="' + W + '" height="' + H + '" rx="5" class="dg-box"/>';
      if (on) s += '<rect x="' + N[id][0] + '" y="' + N[id][1] + '" width="' + W + '" height="' + H + '" rx="5" class="dg-hot"/>';
      var lab = SHORT[id];
      s += '<text x="' + (N[id][0] + W / 2) + '" y="' + (N[id][1] + 15.5) + '" text-anchor="middle" style="font:600 10px var(--font-body);fill:' + (on ? "var(--ink)" : "var(--ink-3)") + '">' +
        '<tspan lang="en">' + esc(lab[0]) + '</tspan><tspan lang="fr">' + esc(lab[1]) + "</tspan></text>";
    });
    s += "</svg>";
    return s;
  }

  function buildRail() {
    var rail = document.getElementById("mq-rail");
    if (!rail || !chapter) return;
    var html = "";
    if (chapter.nodes && chapter.nodes.length) {
      html += '<div class="rail-block"><p class="rail-label">' + bi("Where this lives", "Où ça vit") + '</p><figure class="minimap" style="margin:0">' + buildMinimap() +
        "<figcaption>" + bi("Highlighted: the processes this chapter is about.", "En surbrillance : les processus dont parle ce chapitre.") + "</figcaption></figure></div>";
    }
    html += '<div class="rail-block"><p class="rail-label">' + bi("On this page", "Sur cette page") + '</p><ol class="toc" id="mq-toc"></ol></div>';
    rail.innerHTML = html;
    buildToc();
    document.addEventListener("mq:lang", buildToc);
  }

  var tocObserver = null;
  function headingText(h) {
    var clone = h.cloneNode(true);
    clone.querySelectorAll(".anchor-link").forEach(function (a) { a.parentNode.removeChild(a); });
    return clone.textContent;
  }
  function buildToc() {
    var list = document.getElementById("mq-toc");
    if (!list) return;
    var l = lang();
    var items = [];
    document.querySelectorAll(".prose > section.sec[id]").forEach(function (sec) {
      var h2 = null;
      sec.querySelectorAll(':scope [lang="' + l + '"] h2').forEach(function (h) { if (!h2) h2 = h; });
      if (!h2) return;
      items.push({ id: sec.id, text: headingText(h2), sub: false, sec: sec });
      sec.querySelectorAll(':scope [lang="' + l + '"] h3[id]').forEach(function (h3) {
        if (h3.closest(".note, .takeaways, .lab")) return;
        items.push({ id: h3.id, text: headingText(h3), sub: true, sec: sec });
      });
    });
    list.innerHTML = items.map(function (it) {
      return '<li class="' + (it.sub ? "sub" : "") + '"><a href="#' + it.id + '" data-sec="' + it.sec.id + '">' + esc(it.text.trim()) + "</a></li>";
    }).join("");
    if (tocObserver) tocObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;
    tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        list.querySelectorAll("a").forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-15% 0px -70% 0px" });
    document.querySelectorAll(".prose > section.sec[id]").forEach(function (s) { tocObserver.observe(s); });
  }

  function decorateHeadings() {
    document.querySelectorAll(".prose > section.sec[id]").forEach(function (sec) {
      sec.querySelectorAll("h2").forEach(function (h) {
        if (h.querySelector(".anchor-link")) return;
        var a = el("a", { class: "anchor-link", href: "#" + sec.id, "aria-label": L("Link to this section", "Lien vers cette section") }, "#");
        h.appendChild(a);
      });
      ["en", "fr"].forEach(function (l) {
        var k = 0;
        sec.querySelectorAll(':scope [lang="' + l + '"] h3').forEach(function (h) {
          if (h.closest(".note, .takeaways, .lab")) return;
          k++;
          if (!h.id) h.id = sec.id + "--" + k + "-" + l;
          if (!h.querySelector(".anchor-link")) h.appendChild(el("a", { class: "anchor-link", href: "#" + h.id, "aria-label": "#" }, "#"));
        });
      });
    });
  }

  function buildChapterFoot() {
    var host = document.querySelector("[data-chapter-foot]");
    if (!host || !chapter) return;
    var idx = chapter.index;
    var prev = idx > 0 ? D.chapters[D.order[idx - 1]] : null;
    var next = idx < D.order.length - 1 ? D.chapters[D.order[idx + 1]] : null;
    var buildsOn = (chapter.req || []).map(function (id) { return D.chapters[id]; });
    var leadsTo = D.order.map(function (id) { return D.chapters[id]; }).filter(function (c) {
      return (c.req || []).indexOf(pageId) >= 0;
    });
    function li(c) { return '<li><a href="' + c.file + '">' + c.n + " · " + bi(c.en.t, c.fr.t) + "</a></li>"; }
    var html = '<div class="chapter-links">';
    if (buildsOn.length) html += "<div><h3>" + bi("Builds on", "S'appuie sur") + "</h3><ul>" + buildsOn.map(li).join("") + "</ul></div>";
    if (leadsTo.length) html += "<div><h3>" + bi("Leads to", "Mène à") + "</h3><ul>" + leadsTo.map(li).join("") + "</ul></div>";
    html += "</div>";
    html += '<nav class="pager" aria-label="' + L("Chapters", "Chapitres") + '">';
    if (prev) html += '<a class="prev" href="' + prev.file + '"><span>← ' + bi("Previous", "Précédent") + " · " + prev.n + "</span><b>" + bi(prev.en.t, prev.fr.t) + "</b></a>";
    if (next) html += '<a class="next" href="' + next.file + '"><span>' + bi("Next", "Suivant") + " · " + next.n + " →</span><b>" + bi(next.en.t, next.fr.t) + "</b></a>";
    html += "</nav>";
    host.innerHTML = html;

    // A chapter counts as finished once its takeaways have been on screen.
    var tk = document.querySelector(".takeaways");
    if (tk && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            markVisited(pageId);
            var me = document.querySelector('.curr-chapter a[aria-current="page"]');
            if (me) me.parentNode.classList.add("visited");
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(tk);
    }
  }

  /* ------------------------------------------------------ code highlighting */
  var CS_KEYWORDS = ("abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while when where yield async await get set init required nameof not and or with").split(" ");
  var CS_TYPES = ("Span ReadOnlySpan List Dictionary HashSet ConcurrentDictionary ConcurrentQueue Queue Action Func Task Thread Interlocked Volatile Monitor Stopwatch Environment Math Array ArrayPool TimeSpan DateTime Exception").split(" ");
  var kwSet = {}; CS_KEYWORDS.forEach(function (k) { kwSet[k] = 1; });
  var typeSet = {}; CS_TYPES.forEach(function (k) { typeSet[k] = 1; });

  function span(cls, s) { return '<span class="' + cls + '">' + esc(s) + "</span>"; }
  function highlightCs(src) {
    var out = "", i = 0, n = src.length, m;
    var re = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|@"(?:[^"]|"")*"|\$?"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])'|\b0[xX][0-9a-fA-F_]+[uUlL]*\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[fFdDmMuUlL]*\b|\[[A-Z][A-Za-z]*(?:\([^\]\n]*\))?\]|[A-Za-z_][A-Za-z0-9_]*/g;
    while ((m = re.exec(src)) !== null) {
      if (m.index > i) out += esc(src.slice(i, m.index));
      var tok = m[0], c0 = tok.charAt(0);
      if (tok.indexOf("//") === 0 || tok.indexOf("/*") === 0) out += span("tok-com", tok);
      else if (c0 === '"' || c0 === "'" || c0 === "@" || c0 === "$") out += span("tok-str", tok);
      else if (/^\d/.test(tok)) out += span("tok-num", tok);
      else if (c0 === "[") out += span("tok-attr", tok);
      else if (kwSet[tok]) out += span("tok-key", tok);
      else if (typeSet[tok]) out += span("tok-type", tok);
      else out += esc(tok);
      i = m.index + tok.length;
    }
    if (i < n) out += esc(src.slice(i));
    return out;
  }
  function highlightJson(src) {
    var out = "", i = 0, m;
    var re = /\/\/[^\n]*|"(?:\\.|[^"\\])*"(\s*:)?|\b-?\d+(?:\.\d+)?\b|\b(?:true|false|null)\b/g;
    while ((m = re.exec(src)) !== null) {
      if (m.index > i) out += esc(src.slice(i, m.index));
      var tok = m[0];
      if (tok.indexOf("//") === 0) out += span("tok-com", tok);
      else if (tok.charAt(0) === '"') out += m[1] ? span("tok-attr", tok.slice(0, tok.length - m[1].length)) + esc(m[1]) : span("tok-str", tok);
      else if (/^-?\d/.test(tok)) out += span("tok-num", tok);
      else out += span("tok-key", tok);
      i = m.index + tok.length;
    }
    if (i < src.length) out += esc(src.slice(i));
    return out;
  }
  function highlightPlain(src) {
    // Pseudo-code and diagrams in text: only comments (# or //) are coloured.
    return src.split("\n").map(function (line) {
      var k = line.search(/(^|\s)(#|\/\/)\s/);
      if (k < 0) return esc(line);
      return esc(line.slice(0, k)) + span("tok-com", line.slice(k));
    }).join("\n");
  }

  function decorateCode() {
    document.querySelectorAll(".code").forEach(function (box) {
      var code = box.querySelector("pre code");
      if (!code || code.getAttribute("data-done")) return;
      var langName = code.getAttribute("data-lang") || "txt";
      var src = code.textContent.replace(/^\n+|\s+$/g, "");
      if (langName === "cs") code.innerHTML = highlightCs(src);
      else if (langName === "json") code.innerHTML = highlightJson(src);
      else code.innerHTML = highlightPlain(src);
      code.setAttribute("data-done", "1");
      var head = box.querySelector(".code-head");
      if (!head) {
        head = el("div", { class: "code-head" });
        box.insertBefore(head, box.firstChild);
      }
      if (!head.querySelector(".lang")) head.appendChild(el("span", { class: "lang", text: { cs: "C#", json: "JSON", txt: "text", sql: "SQL", ps: "PowerShell" }[langName] || langName }));
      var btn = el("button", { class: "copy-btn", type: "button" });
      btn.innerHTML = bi("Copy", "Copier");
      btn.addEventListener("click", function () {
        var done = function () { btn.innerHTML = bi("Copied", "Copié"); setTimeout(function () { btn.innerHTML = bi("Copy", "Copier"); }, 1400); };
        var fallback = function () {
          var r = document.createRange(); r.selectNodeContents(code);
          var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        };
        try {
          navigator.clipboard.writeText(src).then(done, fallback);
        } catch (e) { fallback(); }
      });
      head.appendChild(btn);
    });
  }

  /* --------------------------------------------------------- glossary terms */
  function decorateTerms() {
    var G = window.MQ_GLOSSARY;
    if (!G) return;
    var map = {};
    G.forEach(function (g) { map[g.id] = g; });
    function apply() {
      document.querySelectorAll("a.term[data-term]").forEach(function (a) {
        var g = map[a.getAttribute("data-term")];
        if (!g) return;
        var def = tr(g).def || "";
        a.title = tr(g).term + " — " + def.replace(/<[^>]+>/g, "");
        if (!a.getAttribute("href")) a.setAttribute("href", "glossary.html#" + g.id);
      });
    }
    apply();
    document.addEventListener("mq:lang", apply);
  }

  /* ----------------------------------------------------------------- search */
  var searchState = { open: false, loading: false, filter: null, sel: 0, results: [] };
  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9#+.]+/g, " ").trim();
  }
  function ensureIndex(cb) {
    if (window.MQ_INDEX) { prepIndex(); cb(); return; }
    if (searchState.loading) { searchState.pending = cb; return; }
    searchState.loading = true;
    searchState.pending = cb;
    var s = document.createElement("script");
    s.src = "assets/js/search-index.js";
    s.onload = function () { searchState.loading = false; prepIndex(); if (searchState.pending) searchState.pending(); };
    s.onerror = function () {
      searchState.loading = false;
      window.MQ_INDEX = { docs: fallbackDocs(), rules: [] };
      prepIndex();
      if (searchState.pending) searchState.pending();
    };
    document.head.appendChild(s);
  }
  // Without a generated index, search still covers titles and summaries from the registry.
  function fallbackDocs() {
    var docs = [];
    D.order.forEach(function (id) {
      var c = D.chapters[id];
      ["en", "fr"].forEach(function (l) { docs.push({ p: id, a: "", l: l, h: c[l].t, t: c[l].d, k: "page" }); });
    });
    return docs;
  }
  function prepIndex() {
    var I = window.MQ_INDEX;
    if (!I || I._prepared) return;
    I.docs.forEach(function (d) {
      d._h = norm(d.h);
      d._t = norm(d.t);
      d._p = D.chapters[d.p] ? norm(D.chapters[d.p][d.l].t) : norm(d.p);
    });
    I._prepared = true;
  }
  function scoreDoc(d, terms) {
    var score = 0;
    for (var i = 0; i < terms.length; i++) {
      var q = terms[i], hit = false;
      var reWord = new RegExp("(^| )" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      if (d._h.indexOf(q) >= 0) { score += reWord.test(d._h) ? 9 : 4; hit = true; }
      if (d._p.indexOf(q) >= 0) { score += reWord.test(d._p) ? 4 : 2; hit = true; }
      var idx = d._t.indexOf(q);
      if (idx >= 0) {
        hit = true;
        var count = 0, from = 0;
        while ((from = d._t.indexOf(q, from)) >= 0 && count < 6) { count++; from += q.length; }
        score += (reWord.test(d._t) ? 1.5 : 0.8) * count;
      }
      if (!hit) return 0;
    }
    if (d.k === "page") score += 2;
    if (d.k === "rule") score += 1;
    return score;
  }
  function snippet(d, terms) {
    var t = d.t || "";
    var nt = norm(t);
    // Map positions in normalized text back to the original: both keep length when only diacritics differ,
    // except for stripped punctuation. We search the original text case-insensitively instead.
    var lower = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var pos = -1;
    for (var i = 0; i < terms.length && pos < 0; i++) pos = lower.indexOf(terms[i]);
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - 70), end = Math.min(t.length, pos + 150);
    var s = (start > 0 ? "…" : "") + t.slice(start, end) + (end < t.length ? "…" : "");
    var html = esc(s);
    terms.forEach(function (q) {
      if (q.length < 2) return;
      var reQ = new RegExp("(" + q.split("").map(function (ch) {
        var c = ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        var alts = { a: "aàâä", e: "eéèêë", i: "iîï", o: "oôö", u: "uùûü", c: "cç" }[ch];
        return alts ? "[" + alts + alts.toUpperCase() + "]" : c;
      }).join("") + ")", "gi");
      html = html.replace(reQ, "<mark>$1</mark>");
    });
    void nt;
    return html;
  }
  function runSearch(q) {
    var I = window.MQ_INDEX;
    var list = document.getElementById("mq-results");
    if (!I || !list) return;
    var terms = norm(q).split(" ").filter(function (x) { return x.length > 0; });
    if (!terms.length) {
      list.innerHTML = '<li class="search-empty">' + esc(L("Type to search every chapter, the glossary and the rules of thumb. Accents are optional.",
        "Tapez pour chercher dans tous les chapitres, le glossaire et les règles d'or. Les accents sont facultatifs.")) + "</li>";
      searchState.results = [];
      return;
    }
    var l = lang();
    var scored = [];
    I.docs.forEach(function (d) {
      if (d.l !== l) return;
      if (searchState.filter) {
        var c = D.chapters[d.p];
        if (!c || c.cats.indexOf(searchState.filter) < 0) return;
      }
      var s = scoreDoc(d, terms);
      if (s > 0) scored.push({ d: d, s: s });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    // One or two hits per section is enough; keep the list scannable.
    var seen = {}, results = [];
    for (var i = 0; i < scored.length && results.length < 30; i++) {
      var key = scored[i].d.p + "#" + scored[i].d.a + scored[i].d.k;
      if (seen[key]) continue;
      seen[key] = 1;
      results.push(scored[i].d);
    }
    searchState.results = results;
    searchState.sel = 0;
    if (!results.length) {
      list.innerHTML = '<li class="search-empty">' + esc(L("Nothing matches. Try a shorter word, or remove the topic filter.",
        "Aucun résultat. Essayez un mot plus court, ou retirez le filtre de thème.")) + "</li>";
      return;
    }
    list.innerHTML = results.map(function (d, k) {
      var c = D.chapters[d.p];
      var where = c ? c.n + " · " + c[l].t : (d.k === "term" ? L("Glossary", "Glossaire") : d.p);
      var href = (c ? c.file : (d.k === "term" ? "glossary.html" : d.p + ".html")) + (d.a ? "#" + d.a : "");
      var kind = d.k === "rule" ? L("Rule · ", "Règle · ") : "";
      return '<li><a href="' + href + '" class="' + (k === 0 ? "sel" : "") + '"><span class="r-path">' + esc(kind + where) +
        '</span><span class="r-title">' + esc(d.h) + '</span><span class="r-snip">' + snippet(d, terms) + "</span></a></li>";
    }).join("");
  }
  function moveSel(delta) {
    var links = document.querySelectorAll("#mq-results a");
    if (!links.length) return;
    searchState.sel = (searchState.sel + delta + links.length) % links.length;
    links.forEach(function (a, i) { a.classList.toggle("sel", i === searchState.sel); });
    links[searchState.sel].scrollIntoView({ block: "nearest" });
  }
  function openSearch() {
    if (searchState.open) return;
    searchState.open = true;
    var ov = el("div", { class: "search-overlay", id: "mq-search", role: "dialog", "aria-modal": "true", "aria-label": L("Search", "Recherche") });
    var chips = Object.keys(D.categories).map(function (k) {
      return '<button type="button" class="chip" data-cat="' + k + '" aria-pressed="false">' + esc(tr(D.categories[k])) + "</button>";
    }).join("");
    ov.innerHTML = '<div class="search-panel">' +
      '<div class="search-input-row">' + SEARCH_ICON + '<input id="mq-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="' +
      esc(L("Search: tick, AoI, varint, reconciliation…", "Chercher : tick, AoI, varint, réconciliation…")) + '"><kbd>Esc</kbd></div>' +
      '<div class="search-filters" aria-label="' + esc(L("Filter by topic", "Filtrer par thème")) + '">' + chips + "</div>" +
      '<ul class="search-results" id="mq-results"></ul>' +
      '<div class="search-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> ' + esc(L("to move", "pour naviguer")) + "</span><span><kbd>Enter</kbd> " + esc(L("to open", "pour ouvrir")) +
      "</span><span>" + esc(L("Results follow the current language.", "Les résultats suivent la langue active.")) + "</span></div></div>";
    body.appendChild(ov);
    var input = document.getElementById("mq-search-input");
    ov.addEventListener("click", function (e) { if (e.target === ov) closeSearch(); });
    ov.querySelectorAll("[data-cat]").forEach(function (b) {
      b.addEventListener("click", function () {
        var cat = b.getAttribute("data-cat");
        searchState.filter = searchState.filter === cat ? null : cat;
        ov.querySelectorAll("[data-cat]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-cat") === searchState.filter)); });
        runSearch(input.value);
        input.focus();
      });
    });
    input.addEventListener("input", function () { runSearch(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); moveSel(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveSel(-1); }
      else if (e.key === "Enter") {
        var a = document.querySelectorAll("#mq-results a")[searchState.sel];
        if (a) { e.preventDefault(); window.location.href = a.getAttribute("href"); closeSearch(); }
      }
    });
    document.getElementById("mq-results").innerHTML = '<li class="search-empty">' + esc(L("Loading the index…", "Chargement de l'index…")) + "</li>";
    ensureIndex(function () { runSearch(input.value); });
    setTimeout(function () { input.focus(); }, 10);
  }
  function closeSearch() {
    var ov = document.getElementById("mq-search");
    if (ov) ov.parentNode.removeChild(ov);
    searchState.open = false;
    var btn = document.getElementById("mq-search-btn");
    if (btn) btn.focus();
  }
  MQ.openSearch = openSearch;
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); if (searchState.open) closeSearch(); else openSearch(); return; }
    if (e.key === "/" && !typing && !searchState.open) { e.preventDefault(); openSearch(); return; }
    if (e.key === "Escape") {
      if (searchState.open) closeSearch();
      else if (body.classList.contains("drawer-open")) toggleDrawer(false);
    }
  });

  /* ----------------------------------------------------------------- footer */
  function buildFooter() {
    var host = document.getElementById("mq-footer");
    if (!host) return;
    var links = [];
    if (D.site.links.github) links.push('<a href="' + esc(D.site.links.github) + '" rel="noopener">GitHub</a>');
    if (D.site.links.linkedin) links.push('<a href="' + esc(D.site.links.linkedin) + '" rel="noopener">LinkedIn</a>');
    if (D.site.links.contact) links.push("<span>" + esc(D.site.links.contact) + "</span>");
    host.innerHTML = '<div class="footer-inner"><div><strong>' + esc(D.site.name) + "</strong> · " + biObj(D.site.tagline) + "<br>" +
      bi("An ongoing solo project, shared for educational purposes: my choices and findings, not a prescription.",
        "Un projet solo en cours, partagé dans un but éducatif : mes choix et mes constats, pas une prescription.") +
      "</div><div>" + (links.length ? links.join(" · ") + "<br>" : "") +
      bi("Code excerpts are simplified from the project's C# and translated.", "Les extraits de code sont simplifiés depuis le C# du projet et traduits.") + "</div></div>";
  }

  /* --------------------------------------------------- home / topics / lists */
  function buildRoute() {
    var host = document.getElementById("mq-route");
    if (!host) return;
    var v = visited();
    var html = "";
    D.parts.forEach(function (p) {
      var lv = p.chapters.map(function (id) { return D.chapters[id].level; });
      var lo = Math.min.apply(null, lv), hi = Math.max.apply(null, lv);
      var range = lo === hi ? D.levels[lo] : { en: D.levels[lo].en + " → " + D.levels[hi].en, fr: D.levels[lo].fr + " → " + D.levels[hi].fr };
      html += '<li><div class="station" aria-hidden="true">' + p.n + "</div><div>" +
        '<div class="stage-head"><h3>' + bi(p.en, p.fr) + '</h3><span class="lvlr">' + biObj(range) + "</span></div>" +
        '<p class="stage-why">' + bi(p.wen, p.wfr) + "</p>" +
        '<div class="stage-chapters">' + p.chapters.map(function (id) {
          var c = D.chapters[id];
          return '<a href="' + c.file + '" class="' + (v.indexOf(id) >= 0 ? "visited" : "") + '"><span class="cn">' + c.n + "</span>" + bi(c.en.t, c.fr.t) + "</a>";
        }).join("") + "</div></div></li>";
    });
    host.innerHTML = html;
  }

  function buildTopics() {
    var host = document.getElementById("mq-topics");
    if (!host) return;
    var filters = document.getElementById("mq-topic-filters");
    var state = { cat: null, level: null };
    var hash = (window.location.hash || "").replace("#", "");
    if (D.categories[hash]) state.cat = hash;
    function render() {
      var l = lang();
      var html = "";
      var count = 0;
      D.order.forEach(function (id) {
        var c = D.chapters[id];
        if (state.cat && c.cats.indexOf(state.cat) < 0) return;
        if (state.level && c.level !== state.level) return;
        count++;
        html += '<a class="card" href="' + c.file + '"><div class="card-top"><span class="card-num">' + c.n + "</span>" + levelPips(c.level) + "</div>" +
          "<h3>" + esc(c[l].t) + "</h3><p>" + esc(c[l].d) + '</p><div class="chips">' +
          c.cats.map(function (k) { return '<span class="chip">' + esc(tr(D.categories[k])) + "</span>"; }).join("") + "</div></a>";
      });
      host.innerHTML = count ? html : '<div class="empty">' + esc(L("No chapter matches both filters.", "Aucun chapitre ne correspond aux deux filtres.")) + "</div>";
      var info = document.getElementById("mq-topic-desc");
      if (info) info.textContent = state.cat ? tr({ en: D.categories[state.cat].den, fr: D.categories[state.cat].dfr }) : "";
    }
    function renderFilters() {
      var l = lang();
      var catBtns = '<button type="button" class="chip" data-f="cat" data-v="" aria-pressed="' + (!state.cat) + '">' + esc(L("All topics", "Tous les thèmes")) + "</button>" +
        Object.keys(D.categories).map(function (k) {
          var n = D.order.filter(function (id) { return D.chapters[id].cats.indexOf(k) >= 0; }).length;
          return '<button type="button" class="chip" data-f="cat" data-v="' + k + '" aria-pressed="' + (state.cat === k) + '">' + esc(D.categories[k][l]) + ' <span class="muted">' + n + "</span></button>";
        }).join("");
      var lvlBtns = '<button type="button" class="chip" data-f="level" data-v="" aria-pressed="' + (!state.level) + '">' + esc(L("Any level", "Tout niveau")) + "</button>" +
        [1, 2, 3].map(function (n) {
          return '<button type="button" class="chip" data-f="level" data-v="' + n + '" aria-pressed="' + (state.level === n) + '">' + levelPips(n) + esc(D.levels[n][l]) + "</button>";
        }).join("");
      filters.innerHTML = '<div class="row"><b>' + esc(L("Topic", "Thème")) + "</b>" + catBtns + '</div><div class="row"><b>' + esc(L("Level", "Niveau")) + "</b>" + lvlBtns + "</div>";
      filters.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          var f = b.getAttribute("data-f"), v = b.getAttribute("data-v");
          if (f === "cat") {
            state.cat = v || null;
            try { history.replaceState(null, "", v ? "#" + v : window.location.pathname); } catch (e) { /* file:// */ }
          } else state.level = v ? parseInt(v, 10) : null;
          renderFilters(); render();
        });
      });
    }
    renderFilters(); render();
    document.addEventListener("mq:lang", function () { renderFilters(); render(); });
  }

  function buildGlossary() {
    var host = document.getElementById("mq-glossary");
    if (!host || !window.MQ_GLOSSARY) return;
    function render() {
      var l = lang();
      var items = window.MQ_GLOSSARY.slice().sort(function (a, b) {
        return norm(a[l].term).localeCompare(norm(b[l].term));
      });
      var letters = {};
      var html = '<dl class="gloss-list">';
      items.forEach(function (g) {
        var first = norm(g[l].term).charAt(0).toUpperCase();
        var anchor = "";
        if (!letters[first]) { letters[first] = 1; anchor = ' data-letter="' + first + '"'; }
        var see = (g.see || []).filter(function (id) { return D.chapters[id]; }).map(function (id) {
          return '<a href="' + D.chapters[id].file + '">' + D.chapters[id].n + " " + esc(D.chapters[id][l].t) + "</a>";
        }).join(" · ");
        html += '<div class="gloss-item" id="' + g.id + '"' + anchor + "><dt>" + esc(g[l].term) + (g[l].aka ? "<small>" + esc(g[l].aka) + "</small>" : "") + "</dt><dd>" + g[l].def +
          (see ? '<span class="see">' + esc(L("See: ", "Voir : ")) + see + "</span>" : "") + "</dd></div>";
      });
      html += "</dl>";
      var nav = '<nav class="letter-nav" aria-label="' + esc(L("Jump to letter", "Aller à la lettre")) + '">' +
        Object.keys(letters).map(function (k) { return '<a href="#letter-' + k + '">' + k + "</a>"; }).join("") + "</nav>";
      host.innerHTML = nav + html;
      host.querySelectorAll("[data-letter]").forEach(function (n) {
        var mark = el("span", { id: "letter-" + n.getAttribute("data-letter") });
        n.insertBefore(mark, n.firstChild);
      });
      if (window.location.hash) {
        var t = document.getElementById(window.location.hash.slice(1));
        if (t) t.scrollIntoView();
      }
    }
    render();
    document.addEventListener("mq:lang", render);
  }

  function buildLessons() {
    var host = document.getElementById("mq-lessons");
    if (!host) return;
    function render() {
      var I = window.MQ_INDEX;
      if (!I || !I.rules || !I.rules.length) {
        host.innerHTML = '<div class="empty">' + esc(L("The rules list is generated by tools/build-index.mjs. Run it once and reload.",
          "La liste des règles est générée par tools/build-index.mjs. Lancez-le une fois puis rechargez.")) + "</div>";
        return;
      }
      var l = lang();
      var html = "";
      D.order.forEach(function (id) {
        var rules = I.rules.filter(function (r) { return r.p === id && r.l === l; });
        if (!rules.length) return;
        var c = D.chapters[id];
        html += '<section class="lesson-group"><h2><a href="' + c.file + '">' + c.n + " · " + esc(c[l].t) + "</a></h2>";
        rules.forEach(function (r) {
          html += '<div class="lesson">' + r.html + '<a class="src" href="' + c.file + (r.a ? "#" + r.a : "") + '">' + esc(L("Read it in context →", "Lire dans son contexte →")) + "</a></div>";
        });
        html += "</section>";
      });
      host.innerHTML = html;
    }
    ensureIndex(render);
    document.addEventListener("mq:lang", render);
  }

  // Every chapter's "Key takeaways", in reading order, grouped by part: the whole site in one scroll.
  function buildTakeaways() {
    var host = document.getElementById("mq-takeaways");
    if (!host) return;
    function render() {
      var I = window.MQ_INDEX;
      if (!I || !I.takeaways || !I.takeaways.length) {
        host.innerHTML = '<div class="empty">' + esc(L("The takeaways are generated by tools/build-index.mjs. Run it once and reload.",
          "Les points à retenir sont générés par tools/build-index.mjs. Lancez-le une fois puis rechargez.")) + "</div>";
        return;
      }
      var l = lang();
      var html = "";
      D.parts.forEach(function (p) {
        var groups = "";
        p.chapters.forEach(function (id) {
          var items = I.takeaways.filter(function (t) { return t.p === id && t.l === l; });
          if (!items.length) return;
          var c = D.chapters[id];
          groups += '<section class="takeaway-group"><h3><a href="' + c.file + '#takeaways"><span class="cn">' + c.n + "</span>" + esc(c[l].t) + "</a></h3><ul>" +
            items.map(function (t) { return "<li>" + t.html + "</li>"; }).join("") + "</ul></section>";
        });
        if (groups) html += '<div class="takeaway-part"><h2><span class="pn">' + p.n + "</span>" + esc(p[l]) + "</h2>" + groups + "</div>";
      });
      host.innerHTML = html;
    }
    ensureIndex(render);
    document.addEventListener("mq:lang", render);
  }

  /* --------------------------------------------------------------- startup */
  function init() {
    buildHeader();
    buildSidebar();
    decorateHeadings();
    buildChapterHead();
    buildRail();
    buildChapterFoot();
    decorateCode();
    decorateTerms();
    buildFooter();
    buildRoute();
    buildTopics();
    buildGlossary();
    buildLessons();
    buildTakeaways();
    updateTitle();
    // Deep link to a section after the chrome shifted the layout.
    if (window.location.hash && chapter) {
      var t = document.getElementById(window.location.hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); }, 30);
    }
    document.dispatchEvent(new CustomEvent("mq:ready"));
  }
  init();
})();
