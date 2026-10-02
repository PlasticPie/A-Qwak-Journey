// MoonQwak — search index builder.
// Usage:  node tools/build-index.mjs
// Reads every chapter listed in assets/js/site-data.js plus the glossary data, and writes
// assets/js/search-index.js (window.MQ_INDEX). No dependencies. Re-run after editing pages.
//
// The index holds one record per section and per language, one per "rule" callout (which also
// feeds the Rules of thumb page), one per glossary term, and one per chapter summary.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = join(here, "..");

function loadBrowserScript(file, ctx) {
  const code = readFileSync(join(siteRoot, file), "utf8");
  vm.runInNewContext(code, ctx, { filename: file });
}

const ctx = { window: {} };
loadBrowserScript("assets/js/site-data.js", ctx);
const D = ctx.window.MQ.data;
if (existsSync(join(siteRoot, "assets/js/glossary-data.js"))) loadBrowserScript("assets/js/glossary-data.js", ctx);
const GLOSSARY = ctx.window.MQ_GLOSSARY || [];
const LANGS = ["en", "fr", "zh"];
// Page blocks carry a BCP 47 tag; records use the site's language code.
const LANG_CODE = { "zh-TW": "zh" };

/* ---------------------------------------------------------------- tiny HTML reader */
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW = new Set(["script", "style"]);
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rarr: "→", larr: "←", times: "×", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»", eacute: "é", egrave: "è" };
function decode(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });
}
function attrs(src) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(src))) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  return out;
}
// Returns a flat list of nodes: {type:'open'|'close'|'text', tag, attrs, text, raw}
function tokenize(html) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    if (m[5] !== undefined) { out.push({ type: "text", text: m[5] }); continue; }
    if (m[2] === undefined) { out.push({ type: "text", text: "<" }); continue; }
    const tag = m[2].toLowerCase();
    if (m[1] === "/") { out.push({ type: "close", tag }); continue; }
    const node = { type: "open", tag, attrs: attrs(m[3]), selfClosing: m[4] === "/" || VOID.has(tag) };
    out.push(node);
    if (RAW.has(tag) && !node.selfClosing) {
      const end = html.toLowerCase().indexOf("</" + tag, re.lastIndex);
      const stop = end < 0 ? html.length : end;
      node.raw = html.slice(re.lastIndex, stop);
      re.lastIndex = stop;
    }
  }
  return out;
}

/* ------------------------------------------------------------- extract one chapter */
function extract(file, pageId) {
  const html = readFileSync(join(siteRoot, file), "utf8");
  const tokens = tokenize(html);
  const stack = [];
  let section = null;            // current section id
  const records = new Map();     // key section|lang -> {h, parts[]}
  const rules = [];              // {a, l, html, text}
  let ruleCapture = null;        // {depth, l, a, htmlParts[], textParts[]}
  const takeaways = [];          // {p, l, html}: one per <li> of the chapter's "Key takeaways"
  let takeCapture = null;        // {depth, l, html[]}
  let heading = null;            // {tag, l, parts[]}
  let inArticle = false;

  const langOf = () => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].lang) return LANG_CODE[stack[i].lang] || stack[i].lang; return null; };
  const skipText = () => stack.some((s) => s.tag === "svg" || s.tag === "script" || s.tag === "style" || s.tag === "canvas" || s.tag === "noscript");

  for (const t of tokens) {
    if (t.type === "open") {
      const entry = { tag: t.tag, lang: t.attrs.lang || null, cls: t.attrs.class || "", id: t.attrs.id || null };
      if (t.tag === "article") inArticle = true;
      if (t.tag === "section" && /\bsec\b/.test(entry.cls) && entry.id) section = entry.id;
      if (takeCapture) takeCapture.html.push(rebuildOpen(t));
      if (!t.selfClosing) stack.push(entry);
      if (!takeCapture && t.tag === "li" && stack.some((s) => /\btakeaways\b/.test(s.cls))) {
        takeCapture = { depth: stack.length, l: langOf(), html: [] };
      }
      if (ruleCapture) ruleCapture.html.push(rebuildOpen(t));
      if (!ruleCapture && t.tag === "div" && /\bnote\b/.test(entry.cls) && /\brule\b/.test(entry.cls) && !/\bsample\b/.test(entry.cls)) {
        ruleCapture = { depth: stack.length, l: langOf(), a: section, html: [], text: [] };
      }
      if (/^h[1-3]$/.test(t.tag)) heading = { tag: t.tag, l: langOf(), parts: [] };
      continue;
    }
    if (t.type === "close") {
      // pop to the matching tag (tolerant of sloppy nesting)
      let idx = -1;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === t.tag) { idx = i; break; }
      if (takeCapture) {
        if (idx + 1 === takeCapture.depth && t.tag === "li") {
          const inner = takeCapture.html.join("").trim();
          if (inner && takeCapture.l) takeaways.push({ p: pageId, l: takeCapture.l, html: inner });
          takeCapture = null;
        } else if (KEEP.has(t.tag)) takeCapture.html.push("</" + t.tag + ">");
      }
      if (ruleCapture) {
        if (idx + 1 === ruleCapture.depth && t.tag === "div") {
          const text = ruleCapture.text.join(" ").replace(/\s+/g, " ").trim();
          const inner = ruleCapture.html.join("").replace(/<p class="note-label"[\s\S]*?<\/p>/, "").trim();
          if (text) rules.push({ p: pageId, a: ruleCapture.a || "", l: ruleCapture.l, html: inner, t: text.replace(/^(Rule|Règle|規則)\s*/i, "") });
          ruleCapture = null;
        } else if (KEEP.has(t.tag)) ruleCapture.html.push("</" + t.tag + ">");
      }
      if (heading && t.tag === heading.tag) {
        const txt = heading.parts.join("").replace(/\s+/g, " ").trim().replace(/#$/, "").trim();
        if (heading.l && section && heading.tag === "h2") {
          const key = section + "|" + heading.l;
          const rec = records.get(key) || { h: "", parts: [] };
          if (!rec.h) rec.h = txt;
          records.set(key, rec);
        }
        if (heading.tag === "h1" && heading.l) {
          const key = "__page|" + heading.l;
          const rec = records.get(key) || { h: txt, parts: [] };
          rec.h = txt;
          records.set(key, rec);
        }
        heading = null;
      }
      if (t.tag === "section" && idx >= 0 && stack[idx].id === section) section = null;
      if (idx >= 0) stack.length = idx;
      continue;
    }
    // text
    if (!inArticle || skipText()) continue;
    const l = langOf();
    const txt = decode(t.text);
    if (heading) heading.parts.push(txt);
    if (takeCapture) takeCapture.html.push(escapeHtml(txt));
    if (ruleCapture) {
      ruleCapture.html.push(escapeHtml(txt));
      if (!stack.some((s) => /\bnote-label\b/.test(s.cls))) ruleCapture.text.push(txt);
    }
    if (!l || !section) continue;
    if (stack.some((s) => /\bnote-label\b/.test(s.cls) || /\banchor-link\b/.test(s.cls))) continue;
    const key = section + "|" + l;
    const rec = records.get(key) || { h: "", parts: [] };
    rec.parts.push(txt);
    records.set(key, rec);
  }

  const docs = [];
  for (const [key, rec] of records) {
    const [a, l] = key.split("|");
    if (a === "__page") continue;
    const text = rec.parts.join(" ").replace(/\s+/g, " ").trim();
    if (!text && !rec.h) continue;
    docs.push({ p: pageId, a, l, h: rec.h || a, t: text.slice(0, 1800), k: "section" });
  }
  for (const r of rules) {
    if (!r.l) continue;
    docs.push({ p: pageId, a: r.a, l: r.l, h: r.t.split(/(?<=[.!?])\s|(?<=[。！？])/)[0].slice(0, 140), t: r.t.slice(0, 600), k: "rule" });
  }
  return { docs, rules, takeaways };
}
function escapeHtml(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
// Tags a rule body may keep when it is copied to the Rules of thumb page.
const KEEP = new Set(["p", "strong", "em", "code", "a", "ul", "ol", "li", "br", "span", "b", "i"]);
function rebuildOpen(t) {
  // Keep only the tags a rule body uses; drop attributes except href/class.
  if (!KEEP.has(t.tag)) return "";
  let s = "<" + t.tag;
  for (const k of ["href", "class"]) if (t.attrs[k]) s += ` ${k}="${t.attrs[k].replace(/"/g, "&quot;")}"`;
  return s + (t.selfClosing ? " />" : ">");
}

/* -------------------------------------------------------------------------- run */
const allDocs = [];
const allRules = [];
const allTakeaways = [];
let missing = 0;
for (const id of D.order) {
  const c = D.chapters[id];
  const file = c.file;
  for (const l of LANGS) allDocs.push({ p: id, a: "", l, h: (c[l] || c.en).t, t: (c[l] || c.en).d, k: "page" });
  if (!existsSync(join(siteRoot, file))) { missing++; continue; }
  const { docs, rules, takeaways } = extract(file, id);
  allDocs.push(...docs);
  allRules.push(...rules);
  allTakeaways.push(...takeaways);
}
for (const g of GLOSSARY) {
  for (const l of LANGS) {
    if (!g[l]) continue;
    allDocs.push({ p: "glossary", a: g.id, l, h: g[l].term, t: (g[l].aka ? g[l].aka + ". " : "") + g[l].def.replace(/<[^>]+>/g, ""), k: "term" });
  }
}

const out = "/* Generated by tools/build-index.mjs — do not edit by hand. */\nwindow.MQ_INDEX = " +
  JSON.stringify({ v: 1, built: new Date().toISOString(), docs: allDocs, rules: allRules, takeaways: allTakeaways }) + ";\n";
writeFileSync(join(siteRoot, "assets/js/search-index.js"), out, "utf8");
console.log(`search index: ${allDocs.length} records, ${allRules.length} rules, ${allTakeaways.length} takeaways, ${GLOSSARY.length} glossary terms` +
  (missing ? `, ${missing} chapter file(s) not written yet` : ""));
