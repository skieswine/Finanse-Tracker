// Client-only text extraction. Heavy libraries are loaded on demand, and the
// file never leaves the browser. (Tesseract downloads its code and the ukr/deu/eng
// model from jsDelivr once; the image itself is processed locally.)

import type { ExtractedDocument, SourceFileType } from "./types";

export type ExtractProgress = { stage: "reading" | "ocr"; progress: number };
type OnProgress = (p: ExtractProgress) => void;

export class ExtractError extends Error {
  constructor(public code: "unsupported" | "empty" | "failed") {
    super(code);
  }
}

export function detectFileType(file: File): SourceFileType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") return "csv";
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (/\.(png|jpe?g|webp|bmp|gif)$/.test(name) || /^image\/(png|jpeg|webp|bmp|gif)$/.test(file.type)) {
    return "image";
  }
  return null;
}

export async function extractDocument(
  file: File,
  type: SourceFileType,
  onProgress: OnProgress = () => {},
): Promise<ExtractedDocument> {
  onProgress({ stage: "reading", progress: 0 });
  let doc: ExtractedDocument;
  switch (type) {
    case "csv":
      doc = await extractCsv(file);
      break;
    case "pdf":
      doc = await extractPdf(file, onProgress);
      break;
    case "docx":
      doc = await extractDocx(file);
      break;
    case "image":
      doc = { kind: "text", lines: await ocr([file], onProgress) };
      break;
  }
  const empty = doc.kind === "table" ? doc.rows.length === 0 : doc.lines.every((l) => !l.trim());
  if (empty) throw new ExtractError("empty");
  return doc;
}

// ---------------------------------------------------------------- CSV

/** German banks still export Windows-1252 / ISO-8859-1. */
export function decodeText(buffer: ArrayBuffer): string {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    // Strip a UTF-8 byte order mark (U+FEFF).
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/**
 * Papaparse's auto-detection picks "," for German files because decimal
 * commas ("2.850,00") are everywhere. Prefer ";" or tab when most lines have them.
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 50);
  for (const d of [";", "\t"]) {
    if (lines.filter((l) => l.includes(d)).length >= lines.length / 2) return d;
  }
  return ",";
}

async function extractCsv(file: File): Promise<ExtractedDocument> {
  const Papa = (await import("papaparse")).default;
  const text = decodeText(await file.arrayBuffer());
  const result = Papa.parse<string[]>(text, { delimiter: detectDelimiter(text), skipEmptyLines: "greedy" });
  return { kind: "table", rows: result.data };
}

// ---------------------------------------------------------------- PDF

type TextItem = { str: string; transform: number[]; width: number };

async function extractPdf(file: File, onProgress: OnProgress): Promise<ExtractedDocument> {
  // Legacy build: the modern one needs very recent JS features and fails in
  // Safari (iPhone, Mac) while working in Chrome.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Copied to /public by scripts/copy-pdf-worker.mjs (postinstall).
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.legacy.min.mjs";

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    lines.push(...itemsToLines(content.items.filter((i): i is TextItem & typeof i => "str" in i)));
    onProgress({ stage: "reading", progress: n / pdf.numPages });
  }

  // Scanned PDF without a text layer → render pages and OCR them.
  if (lines.join("").replace(/\s/g, "").length < 20) {
    const images: Blob[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      images.push(await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new ExtractError("failed"))), "image/png"),
      ));
    }
    return { kind: "text", lines: await ocr(images, onProgress) };
  }
  return { kind: "text", lines };
}

/** Group text items into visual lines (same y), ordered top→bottom, left→right. */
function itemsToLines(items: TextItem[]): string[] {
  const rows: { y: number; items: TextItem[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    const row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (row) row.items.push(item);
    else rows.push({ y, items: [item] });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows.map(({ items: rowItems }) => {
    rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
    let line = "";
    let prevEnd: number | null = null;
    for (const item of rowItems) {
      const x = item.transform[4];
      // A wide gap usually separates columns; keep it as a double space.
      if (prevEnd !== null) line += x - prevEnd > 12 ? "  " : " ";
      line += item.str.trim();
      prevEnd = x + item.width;
    }
    return line;
  });
}

// ---------------------------------------------------------------- DOCX

async function extractDocx(file: File): Promise<ExtractedDocument> {
  const mammoth = (await import("mammoth")).default;
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const dom = new DOMParser().parseFromString(html, "text/html");

  const tableRows = [...dom.querySelectorAll("table tr")].map((tr) =>
    [...tr.querySelectorAll("td, th")].map((cell) => cell.textContent?.trim() ?? ""),
  );
  if (tableRows.length > 1) return { kind: "table", rows: tableRows };

  const lines = [...dom.body.querySelectorAll("p, li")].map((el) => el.textContent ?? "");
  return { kind: "text", lines };
}

// ---------------------------------------------------------------- OCR

// Ukrainian (monobank screenshots), German (statements), English (merchant names).
const OCR_LANGUAGES = ["ukr", "deu", "eng"];

async function ocr(images: Blob[], onProgress: OnProgress): Promise<string[]> {
  const { createWorker } = await import("tesseract.js");
  let page = 0;
  const worker = await createWorker(OCR_LANGUAGES, 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        onProgress({ stage: "ocr", progress: (page + m.progress) / images.length });
      }
    },
  });
  try {
    const lines: string[] = [];
    for (; page < images.length; page++) {
      const { data } = await worker.recognize(images[page]);
      lines.push(...data.text.split(/\r?\n/));
    }
    return lines;
  } finally {
    await worker.terminate();
  }
}
