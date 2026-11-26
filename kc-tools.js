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
  const MAKE = "(?:make|create|generate|produce|build|write|draw|design|give me|send me|export|save|turn this into|turn it into|convert this to|convert it to|i want|i need)";
  const IMAGE_NOUN = "(?:image|picture|photo|illustration|logo|icon|artwork|drawing|poster|wallpaper|avatar|banner|graphic|render)";
  const EDIT_VERB = "(?:change|replace|remove|edit|swap|erase|cut out|blur|retouch|fix|clean up|improve|enhance|crop|resize|recolou?r|add|design|redesign)";
  // Things an edit verb must actually be acting on. Without this, "fix this error"
  // beside a screenshot was read as an image edit and got a canned refusal.
  const PIC_OBJ = "(?:background|backdrop|image|picture|photo|photograph|pic|shot|portrait|selfie|headshot|logo)(?!\\s*(?:path|url|src|link|tag|name|field|column|size|format|picker|gallery|upload))";
  // A format word introduced by this is an EXISTING file the user is talking about,
  // not one to produce: "summarise this pdf" must stay chat.
  const REF = /\b(?:this|that|these|those|my|your|our|the|an?)\s+(?:\w+\s+){0,2}?(?:pdf|csv|xlsx|excel|spread ?sheet|docx|word|document|file|attachment)\b\s*(?:has|have|is|are|says|contains|shows|looks|seems|won'?t|does)?/;
  const USES_EXISTING = /\b(?:summari[sz]e|summary of|translate|read|open|parse|extract|explain|review|check|analy[sz]e|fix|correct|debug|edit|update|convert)\b/;

  // The format noun must be the direct object of a make verb, and either end the
  // clause or be followed by a connector. "build an image gallery in html" fails
  // this, because "gallery" follows the noun — and it should, it wants code.
  const TAIL = "(?:\\s+(?:file|files|sheet|doc|document|version|copy|format))?";
  const AFTER = "(?=\\s*(?:$|[.,;:!?]|of\\b|about\\b|for\\b|with\\b|from\\b|on\\b|containing\\b|listing\\b|showing\\b|summari[sz]ing\\b|that\\b|which\\b|please\\b|using\\b|based\\b))";
  const LEAD = "(?:me\\s+|us\\s+)?(?:a|an|the|one|some)?\\s*(?:\\w+\\s+){0,2}?";
  const objectOf = (low, noun) =>
    new RegExp(`\\b${MAKE}\\s+${LEAD}${noun}\\b${TAIL}${AFTER}`).test(low) ||
    new RegExp(`\\b(?:export|save|download|output)\\s+(?:this|it|that)?\\s*(?:as|to|in)\\s+${LEAD}${noun}\\b${TAIL}`).test(low) ||
    new RegExp(`\\bconvert\\s+(?:this|it|that)\\s+(?:in)?to\\s+${LEAD}${noun}\\b`).test(low);

  function intent(text, opts) {
    const t = String(text || "").trim();
    const o = opts || {};
    const low = t.toLowerCase().replace(/^\s*(?:please|pls|hey|hi|ok|okay|now)[,\s]+/, "").replace(/^\s*(?:can|could|would)\s+you\s+(?:please\s+)?/, "");
    if (!t) return { tool: "chat" };

    // An edit verb counts only when it acts on a picture.
    if (o.hasImage && new RegExp(`\\b${EDIT_VERB}\\b(?:\\s+\\w+){0,3}\\s+(?:\\w+\\s+){0,2}?${PIC_OBJ}\\b`).test(low))
      return { tool: "edit-image", reason: "editing an attached picture" };
    if (o.hasImage && new RegExp(`^\\s*${EDIT_VERB}\\s+${PIC_OBJ}\\b`).test(low))
      return { tool: "edit-image", reason: "editing an attached picture" };

    // A question about a format, or an instruction to act on a file that already
    // exists, is never a request to build a new one.
    if (/^\s*(?:how|what|why|when|where|which|who|explain|describe|tell me about|is|are|does|do|should|can you tell)\b/.test(low) &&
        !new RegExp(`\\b${MAKE}\\b`).test(low))
      return { tool: "chat" };
    if (REF.test(low) && USES_EXISTING.test(low) && !objectOf(low, "(?:pdf|xlsx|csv|docx)"))
      return { tool: "chat" };

    if (objectOf(low, "(?:\\.?xlsx|excel|spread ?sheet|workbook)")) return { tool: "xlsx", prompt: t };
    if (objectOf(low, "(?:\\.?csv)")) return { tool: "csv", prompt: t };
    if (objectOf(low, "(?:\\.?docx|word\\s+(?:document|doc|file))")) return { tool: "docx", prompt: t };
    if (objectOf(low, "(?:\\.?pdf)")) return { tool: "pdf", prompt: t };
    if (objectOf(low, "(?:\\.?zip|zip file|zip archive|archive)") || (/^\s*zip\b/.test(low) && !/\bzip\s*code/.test(low)))
      return { tool: "zip", prompt: t };
    if (!o.imageNow && objectOf(low, IMAGE_NOUN)) return { tool: "image", prompt: t };
    if (!o.imageNow && /^(?:draw|illustrate|sketch)\s+(?:me\s+)?(?:a|an|the)?\s*\w/.test(low) && !/\b(?:in|using|with)\s+(?:html|css|js|javascript|react|svg|code)\b/.test(low))
      return { tool: "image", prompt: t };
    return { tool: "chat" };
  }

  // Strip the instruction wrapper so "make me a pdf about X" prompts the model for X.
  function topicOf(text) {
    const orig = String(text || "").trim();
    let t = orig;
    // Peel the instruction wrapper off the front until only the subject is left,
    // so "create a word document about our Q3 pricing" names the file q3-pricing.
    const peels = [
      new RegExp(`^\\s*${MAKE}\\b\\s*`, "i"),
      /^\s*(?:me|us)\b\s*/i,
      /^\s*(?:a|an|the|some)\b\s*/i,
      /^\s*(?:new|simple|quick|short|small|basic)\b\s*/i,
      /^\s*(?:pdf|zip|archive|xlsx|excel|spread ?sheet|sheet|csv|docx|word|document|doc|file|report|table|list)\b\s*/i,
      /^\s*(?:of|on|about|for|with|containing|listing|showing)\b\s*/i,
      /^\s*(?:my|our|their|its|his|her)\b\s*/i
    ];
    for (let pass = 0; pass < 8; pass++) {
      const before = t;
      for (const re of peels) t = t.replace(re, "");
      if (t === before) break;
    }
    t = t.replace(/[\s.,:;!?]+$/, "").trim();
    return t || orig;
  }

  /* ---------- CSV ---------- */
  // RFC 4180. The BOM is deliberate: without it Excel mangles non-ASCII.
  function csv(rows, opts) {
    const o = opts || {};
    const cell = v => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const body = (rows || []).map(r => (Array.isArray(r) ? r : [r]).map(cell).join(",")).join("\r\n");
    return (o.bom === false ? "" : "﻿") + body + "\r\n";
  }

  /* ---------- Office Open XML ----------
     .xlsx and .docx are both a ZIP of XML parts, and we already write ZIP, so
     these cost no new dependency at all — only the part templates below. */
  const xmlEsc = s => String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;")
    // XML 1.0 forbids most control characters outright; strip rather than emit a corrupt file
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const colName = n => { let s = ""; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; } return s; };
  const isNum = v => typeof v === "number" ? Number.isFinite(v)
    : typeof v === "string" && v.trim() !== "" && /^-?\d+(\.\d+)?$/.test(v.trim());

  function xlsx(opts) {
    const o = opts || {};
    const sheets = (o.sheets && o.sheets.length ? o.sheets : [{ name: "Sheet1", rows: o.rows || [] }])
      .map((s, i) => ({
        // Excel rejects these characters in a sheet name, and caps it at 31
        name: String(s.name || `Sheet${i + 1}`).replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31) || `Sheet${i + 1}`,
        rows: s.rows || []
      }));

    const sheetXml = sh => {
      let rowsXml = "";
      sh.rows.forEach((row, r) => {
        const cells = (Array.isArray(row) ? row : [row]).map((v, c) => {
          const ref = colName(c) + (r + 1);
          if (v === null || v === undefined || v === "") return "";
          return isNum(v)
            ? `<c r="${ref}"><v>${xmlEsc(String(v).trim())}</v></c>`
            : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
        }).join("");
        rowsXml += `<row r="${r + 1}">${cells}</row>`;
      });
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetData>${rowsXml}</sheetData></worksheet>`;
    };

    const files = [
      { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        `</Types>` },
      { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>` },
      { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        sheets.map((s, i) => `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        `</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `</Relationships>` }
    ];
    sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));
    return zip(files);
  }

  function docx(opts) {
    const o = opts || {};
    // Direct formatting rather than named styles, so no styles.xml part is needed.
    const run = (t, sz, bold, mono) =>
      `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` +
      (mono ? `<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>` : "") +
      `</w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
    const para = (t, sz, bold, mono, indent) =>
      `<w:p><w:pPr>${indent ? `<w:ind w:left="${indent}"/>` : ""}<w:spacing w:after="120"/></w:pPr>${t ? run(t, sz, bold, mono) : ""}</w:p>`;

    let body = "";
    if (o.title) body += para(o.title, 40, true);
    if (o.subtitle) body += para(o.subtitle, 18, false);
    for (const b of blocks(o.text || "")) {
      if (b.t === "gap") continue;
      else if (b.t === "h1") body += para(b.s, 34, true);
      else if (b.t === "h2") body += para(b.s, 28, true);
      else if (b.t === "h3") body += para(b.s, 25, true);
      else if (b.t === "h4") body += para(b.s, 23, true);
      else if (b.t === "li") body += para((b.n ? b.n + ". " : "• ") + b.s, 22, false, false, 360);
      else if (b.t === "code") for (const ln of String(b.s).split("\n")) body += para(ln, 18, false, true, 360);
      else body += para(b.s, 22, false);
    }
    if (!body) body = para("", 22, false);

    return zip([
      { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>` },
      { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>` },
      { name: "word/document.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
        `<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>` }
    ]);
  }

  /* Pull a markdown table, or fenced csv, out of model prose into rows. */
  function rowsFrom(text) {
    const t = String(text || "");
    const fence = /```(?:csv|tsv)?\n([\s\S]*?)```/i.exec(t);
    const src = fence ? fence[1] : t;
    const pipes = src.split("\n").filter(l => /^\s*\|.*\|\s*$/.test(l));
    if (pipes.length >= 2) {
      return pipes
        .filter(l => !/^\s*\|[\s:|-]+\|\s*$/.test(l))           // drop the --- separator row
        .map(l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => strip(c.trim())));
    }
    const lines = src.split("\n").map(l => l.trim()).filter(Boolean);
    const sep = lines.some(l => l.includes("\t")) ? "\t" : ",";
    if (lines.length && lines.some(l => l.includes(sep)))
      return lines.map(l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, "")));
    return lines.map(l => [l]);
  }

  // The PDF uses Type1 WinAnsi fonts, so anything above U+00FF becomes "?".
  // Devanagari, CJK and most non-Latin scripts cannot be rendered without an
  // embedded font, which this file deliberately does not carry.
  function pdfWouldLose(text) {
    for (const ch of String(text || "")) {
      const c = ch.codePointAt(0);
      if (c > 0xff && WINANSI[ch] === undefined) return true;
    }
    return false;
  }

  const api = { pdf, zip, csv, xlsx, docx, rowsFrom, intent, blocks, wrap, widthOf, crc32, topicOf, pdfWouldLose };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KCTools = api;
})(typeof window !== "undefined" ? window : globalThis);
