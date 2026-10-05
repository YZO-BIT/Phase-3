import { z } from "zod";
import { events, getConflictingEvent } from "./events";

const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`).refine((value) => !/[\x00-\x1f\x7f]/.test(value), `${label} contains invalid characters`);
const phone = text("Phone", 24).refine((value) => /^\+?[\d ()-]+$/.test(value) && /^\d{10,15}$/.test(value.replace(/\D/g, "")), "Enter a valid phone number");
const enrollment = text("Enrollment number", 60).regex(/^[\p{L}\p{N}\/._-]+$/u, "Enter a valid enrollment number").transform((value) => value.toUpperCase());

export const participantSchema = z.object({
  name: text("Full name", 100), enrollment, email: z.email("Enter a valid email address").max(254).transform((value) => value.toLowerCase()),
  phone, college: text("College", 150), city: text("City", 80), branch: text("Department", 100), year: text("Year of study", 80),
}).strict();
export const teamMemberSchema = z.object({ name: text("Member name", 100), enrollment, email: z.email("Enter each member's email").max(254).transform((value) => value.toLowerCase()), phone }).strict();
export const registrationSchema = z.object({
  participant: participantSchema,
  eventIds: z.array(z.string().max(20)).min(1, "Select at least one event").max(10),
  teamName: z.string().trim().max(100).default(""), members: z.array(teamMemberSchema).max(5).default([]),
  utr: z.string().trim().regex(/^\d{12}$/, "Enter the 12-digit bank reference / UTR"),
  amount: z.number().int().positive(),
  agreements: z.object({ authentic: z.literal(true, "Confirm your details are authentic"), conduct: z.literal(true, "Accept the code of conduct") }).strict(),
  idempotencyKey: z.uuid(),
}).strict().superRefine((input, ctx) => {
  const selected = events.filter((event) => input.eventIds.includes(event.id));
  if (selected.length !== input.eventIds.length) ctx.addIssue({ code: "custom", path: ["eventIds"], message: "Unknown or duplicate event selection" });
  for (const event of selected) if (getConflictingEvent(event, input.eventIds)) {
    ctx.addIssue({ code: "custom", path: ["eventIds"], message: "Selected events have overlapping time slots" }); break;
  }
  if (input.amount !== selected.reduce((sum, event) => sum + event.fee, 0)) ctx.addIssue({ code: "custom", path: ["amount"], message: "Payment amount does not match the selected events" });
  const requiredMembers = Math.max(1, ...selected.map((event) => event.members)) - 1;
  if (requiredMembers > 0 && (!input.teamName || input.members.length < requiredMembers || input.members.length > requiredMembers + 1)) ctx.addIssue({ code: "custom", path: ["members"], message: "Complete the team name and all required roster members" });
  if (!requiredMembers && input.members.length) ctx.addIssue({ code: "custom", path: ["members"], message: "Individual events do not require a team roster" });
  const enrollments = [input.participant.enrollment, ...input.members.map((member) => member.enrollment)];
  const emails = [input.participant.email, ...input.members.map((member) => member.email)];
  if (new Set(enrollments).size !== enrollments.length || new Set(emails).size !== emails.length) ctx.addIssue({ code: "custom", path: ["members"], message: "Each team member needs a unique enrollment number and email" });
});

export type Participant = z.infer<typeof participantSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PdfStatus = "NOT_READY" | "READY";
export type RegistrationView = {
  id: string; createdAt: string; participantName: string; email: string; phone: string; college: string; city: string;
  teamName: string; eventNames: string; eventDates: string; eventTimes: string; registrationType: string; teamSize: string;
  amount: number; proofUrl: string; paymentStatus: PaymentStatus; pdfStatus: PdfStatus; pdfUrl: string | null;
  remarks: string; verifiedBy: string; verifiedAt: string;
};
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];
