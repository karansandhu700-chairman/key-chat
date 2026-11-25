/* Key Chat tools — what the chat models cannot do themselves.
   No dependencies and no network: everything here is built in the browser.
   Exposed as window.KCTools, and as module.exports so it can be tested in node. */
(function (root) {
  "use strict";

  /* ---------- text helpers ---------- */

  // PDF Type1 fonts use WinAnsi. Map what we can, drop the rest to "?" rather than
  // writing bytes that render as mojibake.
  const WINANSI = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "--", "…": "...", " ": " ", "•": "-", "₹": "Rs." };
  function toWinAnsi(s) {
    let out = "";
    for (const ch of String(s)) {
      const m = WINANSI[ch];
      if (m !== undefined) { out += m; continue; }
      const c = ch.codePointAt(0);
      out += c <= 0xff ? ch : "?";
    }
    return out;
  }
  const pdfEscape = s => toWinAnsi(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  // Helvetica advance widths (1000-unit em) for the ASCII range, so wrapping is
  // measured rather than guessed at a fixed character count.
  const W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
  const BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
  function widthOf(str, size, bold) {
    const t = bold ? BOLD : W;
    let w = 0;
    for (const ch of toWinAnsi(str)) {
      const c = ch.charCodeAt(0);
      w += (c >= 32 && c <= 126) ? t[c - 32] : (bold ? 556 : 556);
    }
    return w * size / 1000;
  }
  function wrap(text, size, bold, maxW) {
    const lines = [];
    for (const para of String(text).split("\n")) {
      if (!para.trim()) { lines.push(""); continue; }
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (widthOf(next, size, bold) <= maxW) { line = next; continue; }
        if (line) lines.push(line);
        // a single word longer than the line: break it by character
        if (widthOf(word, size, bold) > maxW) {
          let chunk = "";
          for (const ch of word) {
            if (widthOf(chunk + ch, size, bold) > maxW) { lines.push(chunk); chunk = ch; }
            else chunk += ch;
          }
          line = chunk;
        } else line = word;
      }
      lines.push(line);
    }
    return lines;
  }

  /* ---------- markdown -> a simple block list ---------- */
  // Deliberately small: headings, bullets, numbered items, code and paragraphs.
  // Anything else becomes a paragraph rather than being dropped.
  function blocks(md) {
    const out = [];
    let inCode = false, code = [];
    for (const raw of String(md).replace(/\r/g, "").split("\n")) {
      const line = raw.replace(/\t/g, "    ");
      if (/^\s*```/.test(line)) {
        if (inCode) { out.push({ t: "code", s: code.join("\n") }); code = []; inCode = false; }
        else inCode = true;
        continue;
      }
      if (inCode) { code.push(line); continue; }
      const h = /^(#{1,4})\s+(.*)$/.exec(line);
      if (h) { out.push({ t: "h" + h[1].length, s: strip(h[2]) }); continue; }
      const b = /^\s*[-*+]\s+(.*)$/.exec(line);
      if (b) { out.push({ t: "li", s: strip(b[1]) }); continue; }
      const n = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
      if (n) { out.push({ t: "li", s: strip(n[2]), n: n[1] }); continue; }
      if (/^\s*\|.*\|\s*$/.test(line)) { out.push({ t: "p", s: strip(line.replace(/\|/g, "  ").trim()) }); continue; }
      if (!line.trim()) { out.push({ t: "gap" }); continue; }
      out.push({ t: "p", s: strip(line) });
    }
    if (inCode && code.length) out.push({ t: "code", s: code.join("\n") });
    return out;
  }
  const strip = s => String(s)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1")
    .replace(/(^|\W)\*([^*]+)\*/g, "$1$2").replace(/`([^`]+)`/g, "$1")
    .trim();

  /* ---------- PDF ---------- */
  function pdf(opts) {
    const o = opts || {};
    const title = o.title || "Document";
    const PW = 595.28, PH = 841.89, M = 56;      // A4 points, ~20mm margin
    const maxW = PW - M * 2;
    const pages = [];
    let cur = [], y = PH - M;

    const newPage = () => { if (cur.length) pages.push(cur); cur = []; y = PH - M; };
    function put(text, size, bold, gapBefore, indent, mono) {
      const lead = size * 1.42;
      if (gapBefore && y < PH - M) y -= gapBefore;
      const avail = maxW - (indent || 0);
      for (const ln of wrap(text, size, bold, avail)) {
        if (y - lead < M) { newPage(); }
        y -= lead;
        if (ln) cur.push({ x: M + (indent || 0), y, s: ln, size, bold, mono: !!mono });
      }
    }

    put(title, 20, true, 0, 0);
    y -= 6;
    if (o.subtitle) put(o.subtitle, 10, false, 2, 0);
    y -= 10;

    for (const b of blocks(o.text || "")) {
      if (b.t === "gap") { y -= 5; continue; }
      if (b.t === "h1") put(b.s, 17, true, 14, 0);
      else if (b.t === "h2") put(b.s, 14, true, 12, 0);
      else if (b.t === "h3") put(b.s, 12, true, 10, 0);
      else if (b.t === "h4") put(b.s, 11, true, 8, 0);
      else if (b.t === "li") put((b.n ? b.n + ". " : "- ") + b.s, 10.5, false, 2, 14);
      else if (b.t === "code") put(b.s, 9, false, 6, 14, true);
      else put(b.s, 10.5, false, 4, 0);
    }
    newPage();
    if (!pages.length) pages.push([]);

    /* assemble */
    const objs = [];
    const FONT = 3, FONTB = 4, FONTM = 5;
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const firstPage = 6;
    const kids = pages.map((_, i) => `${firstPage + i * 2} 0 R`).join(" ");
    objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
    objs[FONT] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[FONTB] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objs[FONTM] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";

    pages.forEach((items, i) => {
      const pid = firstPage + i * 2, cid = pid + 1;
      objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] ` +
        `/Resources << /Font << /F1 ${FONT} 0 R /F2 ${FONTB} 0 R /F3 ${FONTM} 0 R >> >> /Contents ${cid} 0 R >>`;
      let s = "BT\n";
      let lastFont = "", lastSize = 0;
      for (const it of items) {
        const f = it.mono ? "/F3" : it.bold ? "/F2" : "/F1";
        if (f !== lastFont || it.size !== lastSize) { s += `${f} ${it.size} Tf\n`; lastFont = f; lastSize = it.size; }
        s += `1 0 0 1 ${it.x.toFixed(2)} ${it.y.toFixed(2)} Tm (${pdfEscape(it.s)}) Tj\n`;
      }
      s += "ET";
      objs[cid] = { stream: s };
    });

    const enc = str => { const a = new Uint8Array(str.length); for (let i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xff; return a; };
    const parts = [];
    let len = 0;
    const push = str => { const a = enc(str); parts.push(a); len += a.length; return a.length; };
    const offsets = [];
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    for (let i = 1; i < objs.length; i++) {
      if (!objs[i]) continue;
      offsets[i] = len;
      if (typeof objs[i] === "object" && objs[i].stream !== undefined) {
        const body = objs[i].stream;
        push(`${i} 0 obj\n<< /Length ${enc(body).length} >>\nstream\n${body}\nendstream\nendobj\n`);
      } else push(`${i} 0 obj\n${objs[i]}\nendobj\n`);
    }
    const xref = len;
    const n = objs.length;
    let x = `xref\n0 ${n}\n0000000000 65535 f \n`;
    for (let i = 1; i < n; i++) x += String(offsets[i] || 0).padStart(10, "0") + " 00000 n \n";
    push(x);
    push(`trailer\n<< /Size ${n} /Root 1 0 R /Info << /Title (${pdfEscape(title)}) /Producer (Key Chat) >> >>\nstartxref\n${xref}\n%%EOF\n`);

    const out = new Uint8Array(len);
    let p = 0;
    for (const a of parts) { out.set(a, p); p += a.length; }
    return out;
  }

  /* ---------- ZIP (stored, no compression — correct and dependency-free) ---------- */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; }
    return t;
  })();
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  const utf8 = s => new TextEncoder().encode(s);

  function zip(files) {
    const list = (files || []).map(f => ({
      name: String(f.name || "file").replace(/^\/+/, ""),
      data: typeof f.data === "string" ? utf8(f.data) : new Uint8Array(f.data || [])
    }));
    const chunks = [], central = [];
    let offset = 0;
    const u16 = v => [v & 0xff, (v >>> 8) & 0xff];
    const u32 = v => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

    for (const f of list) {
      const nm = utf8(f.name), crc = crc32(f.data), sz = f.data.length;
      const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0)]);
      chunks.push(local, nm, f.data);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(sz), ...u32(sz), ...u16(nm.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]),
        nm);
      offset += local.length + nm.length + sz;
    }
    const cdStart = offset;
    let cdLen = 0;
    for (const c of central) cdLen += c.length;
    const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(list.length), ...u16(list.length), ...u32(cdLen), ...u32(cdStart), ...u16(0)]);

    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total + cdLen + end.length);
    let p = 0;
    for (const c of chunks) { out.set(c, p); p += c.length; }
    for (const c of central) { out.set(c, p); p += c.length; }
    out.set(end, p);
    return out;
  }

  /* ---------- intent ---------- */
  // Decides which tool a message wants. Conservative on purpose: when in doubt it
  // returns "chat", because a wrong route is worse than no route.
  const MAKE = "(?:make|create|generate|draw|design|produce|build|give me|send me|i want|i need|can you make|please make)";
  const IMAGE_NOUN = "(?:image|picture|photo|illustration|logo|icon|artwork|drawing|poster|wallpaper|avatar|banner|graphic|render)";
  const EDIT_VERB = "(?:change|replace|remove|edit|swap|erase|cut out|blur|retouch|fix|clean up|improve|enhance|crop|resize|recolou?r|add)";

  function intent(text, opts) {
    const t = String(text || "").trim();
    const o = opts || {};
    const low = t.toLowerCase();
    if (!t) return { tool: "chat" };

    // An attached picture plus an editing verb is an edit request, whatever else is said.
    if (o.hasImage && new RegExp(`\\b${EDIT_VERB}\\b`).test(low)) {
      return { tool: "edit-image", reason: "editing an attached picture" };
    }
    // Explicit file asks.
    // "zip" is both the thing and the verb: "make a zip", and "zip these up".
    if (/^\s*zip\b/.test(low) || /\b(?:\.zip|zip file|zip archive)\b/.test(low) ||
        (/\b(?:zip|archive|bundle)\b/.test(low) && new RegExp(`\\b${MAKE}\\b`).test(low)))
      return { tool: "zip", prompt: t };
    if (/\b(pdf|\.pdf)\b/.test(low))
      return { tool: "pdf", prompt: t };
    // Image creation, with no picture attached to act on.
    if (!o.hasImage && new RegExp(`\\b${MAKE}\\b[^.?!]{0,40}\\b${IMAGE_NOUN}\\b`).test(low))
      return { tool: "image", prompt: t };
    if (!o.hasImage && /^(?:draw|illustrate|sketch)\b/.test(low))
      return { tool: "image", prompt: t };
    return { tool: "chat" };
  }

  // Strip the instruction wrapper so "make me a pdf about X" prompts the model for X.
  function topicOf(text) {
    return String(text || "")
      .replace(new RegExp(`^\\s*${MAKE}\\s+`, "i"), "")
      .replace(/^\s*(?:me\s+)?(?:a|an|the)\s+/i, "")
      .replace(/^\s*(pdf|zip|archive|document|file|report)\s*/i, "")
      .replace(/^\s*(?:of|on|about|for|with|containing)\s+/i, "")
      .trim() || String(text || "").trim();
  }

  const api = { pdf, zip, intent, blocks, wrap, widthOf, crc32, topicOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KCTools = api;
})(typeof window !== "undefined" ? window : globalThis);
