import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { events } from "../events";
import type { PrivateRecord } from "./privateStore";

export async function generateRegistrationPdf(record: PrivateRecord, verifiedBy: string, verifiedAt: string) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await readFile(join(process.cwd(), "lib/server/assets/dejavu-sans.ttf")), { subset: true });
  pdf.setTitle(`technIEEEks'26 Phase 3 — ${record.id}`);
  pdf.setAuthor("IEEE Graphic Era Hill University Student Branch");
  pdf.setSubject("Admin-approved Phase 3 registration");
  let page = pdf.addPage([595.28, 841.89]);
  let y = 780;
  function line(text: string, size = 11, accent = false) {
    const words = text.replace(/[\r\n\x00-\x1f]/g, " ").split(/\s+/);
    let current = "";
    const lines: string[] = [];
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(next, size) > 495) { lines.push(current); current = word; } else current = next;
    }
    lines.push(current);
    for (let item of lines) {
      // Break exceptionally long IDs/email strings without overflowing the page.
      while (font.widthOfTextAtSize(item, size) > 495) {
        let end = item.length;
        while (end > 1 && font.widthOfTextAtSize(item.slice(0, end), size) > 495) end--;
        draw(item.slice(0, end)); item = item.slice(end);
      }
      draw(item);
    }
    function draw(text: string) {
      if (y < 65) { page = pdf.addPage([595.28, 841.89]); y = 780; }
      page.drawText(text, { x: 50, y, size, font, color: accent ? rgb(0, 0.38, 0.43) : rgb(0.09, 0.12, 0.15) });
      y -= size + 8;
    }
  }
  line("technIEEEks'26 — PHASE 3", 23, true);
  line("IEEE Student Branch · Graphic Era Hill University, Dehradun");
  y -= 16;
  line("REGISTRATION CONFIRMED", 17, true);
  line(`Registration ID: ${record.id}`);
  line(`Registration Date: ${record.createdAt}`);
  line("Payment Status: APPROVED · Payment Screenshot: RECEIVED · PDF Status: READY");
  line(`Verified By: ${verifiedBy}`);
  line(`Verification Date: ${verifiedAt}`);
  y -= 12;
  const participant = record.input.participant;
  line(`Participant / Captain: ${participant.name}`);
  line(`Enrollment: ${participant.enrollment}`);
  line(`Email: ${participant.email} · Phone: ${participant.phone}`);
  line(`College: ${participant.college} · City: ${participant.city}`);
  line(`Department: ${participant.branch} · Year: ${participant.year}`);
  if (record.input.teamName) line(`Team: ${record.input.teamName}`);
  for (const [index, member] of record.input.members.entries()) line(`Member ${index + 2}: ${member.name} · ${member.enrollment} · ${member.email} · ${member.phone}`);
  y -= 12;
  line("REGISTERED EVENTS", 14, true);
  for (const event of events.filter((event) => record.input.eventIds.includes(event.id))) {
    line(event.title, 12, true);
    line(`${event.date} October 2026 · ${event.slot} · ${event.mode}`);
    line(`${event.venue} · INR ${event.fee}`);
  }
  y -= 10;
  line(`Total Payment: INR ${record.input.amount} · UTR: ${record.input.utr}`, 12, true);
  line("Bring this registration slip and your university ID to the event desk.");
  // Preserve the exact original Unicode record in an attached machine-readable dossier.
  await pdf.attach(Buffer.from(JSON.stringify({ id: record.id, participant, members: record.input.members, eventIds: record.input.eventIds, amount: record.input.amount, verifiedBy, verifiedAt }, null, 2)), "registration-details.json", { mimeType: "application/json", description: "Original registration details" });
  return Buffer.from(await pdf.save());
}
