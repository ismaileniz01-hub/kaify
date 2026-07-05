/**
 * Generates Terms & Cookie policy PDFs from lib/legal/documents/*.
 * Run: npm run legal:pdfs
 */
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { COOKIES_DOCUMENT } from "../lib/legal/documents/cookies";
import { TERMS_DOCUMENT } from "../lib/legal/documents/terms";
import type { LegalDocument } from "../lib/legal/documents/types";

const OUT_DIR = path.join(process.cwd(), "public", "legal");

function writeDocumentPdf(doc: LegalDocument, filename: string) {
  const filePath = path.join(OUT_DIR, filename);
  const pdf = new PDFDocument({ margin: 50, size: "A4" });
  const stream = fs.createWriteStream(filePath);
  pdf.pipe(stream);

  pdf.fontSize(20).font("Helvetica-Bold").text(doc.title, { align: "center" });
  pdf.moveDown(0.5);
  pdf.fontSize(10).font("Helvetica").fillColor("#444444").text(doc.subtitle, {
    align: "center",
  });
  pdf.fillColor("#000000");
  pdf.moveDown(1);

  if (doc.intro) {
    pdf.fontSize(11).font("Helvetica").text(doc.intro, { align: "justify" });
    pdf.moveDown(1);
  }

  for (const section of doc.sections) {
    pdf.fontSize(13).font("Helvetica-Bold").text(section.title);
    pdf.moveDown(0.35);

    for (const block of section.blocks) {
      if (block.type === "p") {
        pdf.fontSize(10.5).font("Helvetica").text(block.text, {
          align: "justify",
          lineGap: 3,
        });
        pdf.moveDown(0.5);
        continue;
      }

      for (const item of block.items) {
        pdf.fontSize(10.5).font("Helvetica").text(`• ${item}`, {
          indent: 12,
          lineGap: 2,
        });
      }
      pdf.moveDown(0.5);
    }

    pdf.moveDown(0.35);
  }

  if (doc.footer) {
    pdf.moveDown(0.5);
    pdf.fontSize(9).font("Helvetica-Oblique").fillColor("#555555").text(doc.footer, {
      align: "center",
    });
  }

  pdf.end();

  return new Promise<string>((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const termsPath = await writeDocumentPdf(
    TERMS_DOCUMENT,
    "kaify-terms-of-service.pdf",
  );
  const cookiesPath = await writeDocumentPdf(
    COOKIES_DOCUMENT,
    "kaify-cookie-policy.pdf",
  );

  console.log("Generated:", termsPath);
  console.log("Generated:", cookiesPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
