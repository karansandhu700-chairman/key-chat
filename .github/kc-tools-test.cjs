/* Router and file-builder tests. keychat-check.cjs drives the UI and never touches
   these, which is how a classifier that answered "summarise this pdf" by building a
   new PDF went green. Run with: node .github/kc-tools-test.cjs */
const T = require("../kc-tools.js");
const assert = require("assert");
const zlib = require("zlib");

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log("FAIL  " + label); } };

/* ---------- intent ---------- */
// [text, imageNow, hasImage(recent), expected]
const CASES = [
  // builds a file
  ["make a pdf of our pricing", 0, 0, "pdf"],
  ["can you make me a pdf", 0, 0, "pdf"],
  ["export this as a pdf", 0, 0, "pdf"],
  ["make a pdf file of the plan", 0, 0, "pdf"],
  ["make an excel of our pricing", 0, 0, "xlsx"],
  ["create an excel sheet of the tiers", 0, 0, "xlsx"],
  ["give me a spreadsheet of the tiers", 0, 0, "xlsx"],
  ["export as xlsx", 0, 0, "xlsx"],
  ["make a csv of the leads", 0, 0, "csv"],
  ["create a word document about the plan", 0, 0, "docx"],
  ["make a word file", 0, 0, "docx"],
  ["make a docx", 0, 0, "docx"],
  ["zip these up", 0, 0, "zip"],
  ["make a zip of the project", 0, 0, "zip"],
  // generates an image
  ["create an image of a sunset", 0, 0, "image"],
  ["make a beautiful image of a mountain", 0, 0, "image"],
  ["create a high quality logo for a cafe", 0, 0, "image"],
  ["make me a logo for a coffee shop", 0, 0, "image"],
  ["draw a cat", 0, 0, "image"],
  ["please draw a cat", 0, 0, "image"],
  ["generate a poster for the launch", 0, 0, "image"],
  // honest refusal: editing a picture we cannot edit
  ["change background", 0, 1, "edit-image"],
  ["remove the background from this photo", 1, 1, "edit-image"],
  ["Design background accordingly", 0, 1, "edit-image"],
  ["blur the background", 1, 1, "edit-image"],
  ["how do I change the background of this photo", 1, 1, "edit-image"],
  // imperatives beside a screenshot must stay chat
  ["fix this error", 1, 1, "chat"],
  ["add this to my notes", 1, 1, "chat"],
  ["improve this paragraph", 1, 1, "chat"],
  ["what is wrong with this code", 1, 1, "chat"],
  ["translate this to Hindi", 1, 1, "chat"],
  ["fix the image path in this code", 1, 1, "chat"],
  ["what does this picture show", 1, 1, "chat"],
  // acting on a file that already exists
  ["summarise this pdf", 0, 0, "chat"],
  ["translate this pdf", 0, 0, "chat"],
  ["this spreadsheet has an error", 0, 0, "chat"],
  ["fix my excel formula", 0, 0, "chat"],
  ["read the attached csv", 0, 0, "chat"],
  ["explain this document", 0, 0, "chat"],
  // code requests that merely mention picture words
  ["build an image gallery in html", 0, 0, "chat"],
  ["create a landing page with a hero banner", 0, 0, "chat"],
  ["design a logo concept in css", 0, 0, "chat"],
  ["draw a chart using react", 0, 0, "chat"],
  // questions about a format
  ["what is the capital of France", 0, 0, "chat"],
  ["how do I use excel formulas", 0, 0, "chat"],
  ["explain what a csv file is", 0, 0, "chat"],
  ["what is a pdf", 0, 0, "chat"],
  ["tell me about zip codes", 0, 0, "chat"],
  ["zip code for Delhi", 0, 0, "chat"],
  ["how do I unzip a file on mac", 0, 0, "chat"],
  ["why is excel so slow", 0, 0, "chat"],
  // a picture in the chat must not block making a new one
  ["create an image of a dog", 0, 1, "image"],
];
for (const [text, imageNow, hasImage, want] of CASES) {
  const got = T.intent(text, { imageNow: !!imageNow, hasImage: !!hasImage }).tool;
  ok(got === want, `intent "${text}" (imageNow=${imageNow}) want ${want} got ${got}`);
}

/* ---------- topicOf ---------- */
ok(T.topicOf("create a word document about our Q3 pricing") === "Q3 pricing", "topicOf strips format words");
ok(T.topicOf("make a csv of the leads") === "leads", "topicOf strips of/the");

/* ---------- rowsFrom ---------- */
const rows = T.rowsFrom("| Tier | Price |\n| --- | --- |\n| Free | 0 |\n| Pro | 29 |");
ok(rows.length === 3 && rows[0][0] === "Tier" && rows[2][1] === "29", "rowsFrom parses a markdown table");
const ids = T.rowsFrom("| Id | Code |\n| --- | --- |\n| 0012345678901234 | 007 |");
ok(ids[1][0] === "0012345678901234" && ids[1][1] === "007", "rowsFrom keeps leading zeros and long ids verbatim");

/* ---------- CSV ---------- */
const c = T.csv([["a", "b,c"], ['quo"te', "new\nline"]]);
ok(c.charCodeAt(0) === 0xfeff, "csv starts with a BOM so Excel reads UTF-8");
ok(c.includes('"b,c"') && c.includes('"quo""te"'), "csv quotes commas and doubles quotes");

/* ---------- PDF ---------- */
const pdfBytes = T.pdf({ title: "T", subtitle: "s", text: "# H\n\nbody text\n\n- one\n- two" });
const pdfStr = Buffer.from(pdfBytes).toString("latin1");
ok(pdfStr.startsWith("%PDF-"), "pdf has a %PDF header");
ok(pdfStr.trimEnd().endsWith("%%EOF"), "pdf ends with %%EOF");
ok(/\/Type \/Page[ \/]/.test(pdfStr) && pdfStr.includes("startxref"), "pdf has a page object and an xref");

/* ---------- ZIP, read back with zlib ---------- */
function zipEntries(buf) {
  const out = {};
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) !== 0x04034b50) break;
    const nameLen = buf.readUInt16LE(i + 26), extraLen = buf.readUInt16LE(i + 28);
    const size = buf.readUInt32LE(i + 18);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString("utf8");
    const start = i + 30 + nameLen + extraLen;
    out[name] = buf.slice(start, start + size);
    i = start + size;
  }
  return out;
}
const z = Buffer.from(T.zip([{ name: "a.txt", data: "hello" }, { name: "d/b.md", data: "# hi" }]));
const ze = zipEntries(z);
ok(ze["a.txt"] && ze["a.txt"].toString() === "hello", "zip stores a file verbatim");
ok(ze["d/b.md"] && ze["d/b.md"].toString() === "# hi", "zip stores a nested path");
ok(z.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) > 0, "zip has a central directory");

/* ---------- XLSX / DOCX are ZIPs of XML ---------- */
const xe = zipEntries(Buffer.from(T.xlsx({ sheets: [{ name: "S", rows: [["Tier", "Price"], ["Pro", 29]] }] })));
ok(!!xe["[Content_Types].xml"] && !!xe["xl/workbook.xml"] && !!xe["xl/worksheets/sheet1.xml"], "xlsx has its required parts");
const sheet = xe["xl/worksheets/sheet1.xml"].toString();
ok(sheet.includes("<v>29</v>"), "xlsx writes numbers as numeric cells, not text");
ok(sheet.includes(">Tier<"), "xlsx writes text as an inline string");
const de = zipEntries(Buffer.from(T.docx({ title: "T", text: "# H\n\nbody" })));
ok(!!de["word/document.xml"] && !!de["[Content_Types].xml"], "docx has its required parts");
ok(de["word/document.xml"].toString().includes("body"), "docx contains the body text");
// every XML part must at least be balanced enough to parse as well-formed
for (const [name, buf] of Object.entries({ ...xe, ...de })) {
  if (!name.endsWith(".xml") && !name.endsWith(".rels")) continue;
  const t = buf.toString();
  ok(t.startsWith("<?xml") && !/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(t), `well-formed XML: ${name}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
