"use client";

import { useEffect, useState } from "react";
import { currency, type FestivalEvent } from "@/lib/events";
import { frontendCurrency, frontendEventById } from "@/lib/frontend-events";
import type { RegistrationView } from "@/lib/registration-data";
import { Icon } from "../Icon";
import type { Participant } from "./ParticipantFields";
import styles from "./Registration.module.css";

export type TeamMember = { name: string; enrollment: string; email: string; phone: string };

export function TeamFields({ participant, selectedEvents, teamName, setTeamName, members, setMembers }: {
  participant: Participant; selectedEvents: FestivalEvent[]; teamName: string; setTeamName: (name: string) => void;
  members: TeamMember[]; setMembers: (members: TeamMember[]) => void;
}) {
  const [alternate, setAlternate] = useState(false);
  const teamEvents = selectedEvents.filter((event) => !(frontendEventById.get(event.id)?.officialMode.startsWith("Individual") ?? event.members === 1));
  const memberCount = Math.max(1, ...teamEvents.map((event) => event.members)) - 1;

  function updateMember(index: number, field: keyof TeamMember, value: string) {
    const next = [...members];
    const current = next[index] ?? { name: "", enrollment: "", email: "", phone: "" };
    next[index] = { ...current, [field]: value };
    setMembers(next);
  }

  if (!teamEvents.length) return <div className={styles.registryPanel}><Icon name="check_circle" /><h3>Individual Tracks Selected</h3><p>No squad roster is required for your selected competitions. Continue to review your registration.</p></div>;
  return <>
    <div className={styles.registryPanel}>
      <h3><Icon name="groups" />Squad Configuration (Leader Protocol)</h3>
      <p>Only the team leader should fill team details. Your personal details from Step 01 will automatically serve as the Captain profile.</p>
      <div className={styles.fields}><div className={styles.field}><label htmlFor="team-name">Official Squad / Team Name *</label><input id="team-name" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Nexus Sentinels" required /></div><div className={styles.field}><label htmlFor="team-leader">Team Leader (Auto-Mapped)</label><input id="team-leader" value={`${participant.name} (${participant.enrollment})`} readOnly /></div></div>
    </div>
    <div className={styles.registryPanel}><p className={styles.stepLabel}>Secondary Roster Members</p>
      {Array.from({ length: memberCount + (alternate ? 1 : 0) }, (_, index) => <div className={styles.memberRow} key={index}>
        {(["name", "enrollment", "email", "phone"] as const).map((field) => <div key={field}><label className="sr-only" htmlFor={`member-${index}-${field}`}>{index >= memberCount ? "Alternate" : `Member ${index + 2}`} {field}</label><input id={`member-${index}-${field}`} type={field === "phone" ? "tel" : field === "email" ? "email" : "text"} placeholder={`Member ${index + 2} ${field === "name" ? "Full Name" : field === "enrollment" ? "Enrollment ID" : field === "email" ? "Email" : "Mobile"}`} value={members[index]?.[field] ?? ""} onChange={(e) => updateMember(index, field, e.target.value)} required={index < memberCount} /></div>)}
      </div>)}
      <button className={styles.textButton} type="button" onClick={() => setAlternate(!alternate)}><Icon name="add_circle" />{alternate ? "Remove Alternate Substitute" : "Add Alternate Substitute (Optional)"}</button>
    </div>
  </>;
}

export function Review({ participant, selectedEvents, total, teamName, members, agreements, setAgreements }: { participant: Participant; selectedEvents: FestivalEvent[]; total: number; teamName: string; members: TeamMember[]; agreements: { authentic: boolean; conduct: boolean }; setAgreements: (agreements: { authentic: boolean; conduct: boolean }) => void }) {
  const details = [["Full Name", participant.name], ["Enrollment ID", participant.enrollment], ["Email Address", participant.email], ["Phone / WhatsApp", participant.phone], ["College", participant.college], ["City", participant.city]];
  const teamEvents = selectedEvents.filter((event) => !(frontendEventById.get(event.id)?.officialMode.startsWith("Individual") ?? event.members === 1));
  return <div className={styles.registryPanel}>
    <p className={styles.stepLabel}>Candidate Record</p><dl className={styles.reviewDetails}>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <p className={styles.stepLabel}>Selected Battle Tracks</p>
    <div className={styles.reviewEvents}>{selectedEvents.map((event) => { const official = frontendEventById.get(event.id); return <div key={event.id}><div><strong>{event.title}</strong><p>{official?.officialDate ?? `${event.date} Oct`} • {official?.officialTime ?? event.slot} • {official?.officialMode ?? event.mode}</p></div><span>{official ? frontendCurrency(official.officialFee) : currency(event.fee)}</span></div>; })}</div>
    {teamEvents.length > 0 && <div className={styles.reviewRoster}><p className={styles.stepLabel}>Team Roster • {teamName}</p><p>{participant.name} (Captain){members.slice(0, Math.max(...teamEvents.map((event) => event.members)) - 1).map((member) => ` • ${member.name}`).join("")}</p></div>}
     <div className={styles.reviewTotals}><div><span>Track Subtotal:</span><strong>{frontendCurrency(selectedEvents.reduce((sum, event) => sum + (frontendEventById.get(event.id)?.officialFee ?? event.fee), 0))}.00</strong></div><div><span>IEEE SB Processing:</span><span>₹0.00 (Waived)</span></div><div><strong>Total Payable:</strong><strong>{frontendCurrency(selectedEvents.reduce((sum, event) => sum + (frontendEventById.get(event.id)?.officialFee ?? event.fee), 0))}.00</strong></div></div>
    <div className={styles.agreements}><label><input type="checkbox" checked={agreements.authentic} onChange={(event) => setAgreements({ ...agreements, authentic: event.target.checked })} required /><span>I confirm that all entered details, department codes, and university enrollment IDs are authentic.</span></label><label><input type="checkbox" checked={agreements.conduct} onChange={(event) => setAgreements({ ...agreements, conduct: event.target.checked })} required /><span>I agree to the IEEE SB GEHU Code of Conduct, tournament anti-cheat protocols, and conflict scheduling guidelines.</span></label></div>
  </div>;
}

export function Payment({ total, eventIds, utr, setUtr, screenshot, setScreenshot }: { total: number; eventIds: string[]; utr: string; setUtr: (value: string) => void; screenshot: File | null; setScreenshot: (file: File | null) => void }) {
  const [mode, setMode] = useState("UPI Transfer");
  const [fileError, setFileError] = useState("");
  const [instructions, setInstructions] = useState<{ amount: number; upiId: string; payeeName: string; qrDataUrl: string } | null>(null);
  const [gatewayError, setGatewayError] = useState("");
  const [loadingGateway, setLoadingGateway] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingGateway(true);
    setGatewayError("");
    fetch(`/api/payment?events=${encodeURIComponent(eventIds.join(","))}`, { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Payment instructions are unavailable."); return body; })
      .then((body) => setInstructions(body))
      .catch((error: unknown) => { if (!controller.signal.aborted) setGatewayError(error instanceof Error ? error.message : "Payment instructions are unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setLoadingGateway(false); });
    return () => controller.abort();
  }, [eventIds]);

  function chooseFile(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setScreenshot(null);
      setFileError("Choose a non-empty PNG, JPG, or WEBP file up to 5MB.");
      return;
    }
    setScreenshot(file);
    setFileError("");
  }

  return <div className={styles.paymentGrid}>
    <div className={`${styles.registryPanel} ${styles.treasuryPanel}`}><p className={styles.stepLabel}>Official Treasury Gateway</p>{instructions ? <img className={styles.paymentQr} src={instructions.qrDataUrl} alt={`UPI payment QR code for ${currency(instructions.amount)}`} /> : <div className={styles.qrIllustration} aria-label="Payment QR code unavailable"><Icon name="qr_code_2" /></div>}<strong className={styles.paymentAmount}>{currency(instructions?.amount ?? total)}.00</strong>{instructions ? <p>Scan via <strong>GPay, PhonePe, Paytm, or BHIM</strong> to:<br /><span className={styles.stepLabel}>{instructions.upiId}</span><br /><small>{instructions.payeeName}</small></p> : <p role="status">{loadingGateway ? "Loading official payment instructions…" : gatewayError}</p>}</div>
    <div className={styles.registryPanel}><p className={styles.stepLabel}>Payment Mode Protocol</p><div className={styles.paymentModes} role="group" aria-label="Payment mode">{["UPI Transfer", "Net Banking", "Desk Slip"].map((item) => <button type="button" key={item} aria-pressed={mode === item} className={mode === item ? styles.activePaymentMode : ""} onClick={() => setMode(item)}>{item}</button>)}</div>
      <div className={styles.field}><label htmlFor="payment-utr">12-Digit Bank Reference / UTR Number *</label><input id="payment-utr" value={utr} onChange={(e) => setUtr(e.target.value)} inputMode="numeric" pattern="[0-9]{12}" placeholder="Enter 12 digits" required /></div>
      <div className={styles.field}><label htmlFor="payment-proof">Payment Proof / Screenshot *</label><label className={styles.uploadZone} htmlFor="payment-proof" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]); }}><Icon name="cloud_upload" /><strong>{screenshot?.name || "Drop transaction screenshot or receipt"}</strong><span>PNG, JPG, or WEBP up to 5MB</span><input className="sr-only" id="payment-proof" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => chooseFile(e.target.files?.[0])} required /></label>{fileError && <p role="alert" className={styles.fileError}>{fileError}</p>}</div>
       <div className={styles.previewNote}><Icon name="info" /><p>Your registration will remain <strong>Payment Verification Pending</strong> until an administrator verifies the screenshot. <strong>PDF Not Ready</strong> until approval.</p></div>
    </div>
  </div>;
}

export function Confirmation({ participant, selectedEvents, registration, onRefresh, onReset }: { participant: Participant; selectedEvents: FestivalEvent[]; registration: RegistrationView; onRefresh: () => Promise<void>; onReset: () => void }) {
  const calendarDates = [...new Set(selectedEvents.map((event) => event.date))];
  const calendarUrl = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: "technIEEEks’26 — Phase 3", dates: `202610${calendarDates[0] ?? 16}/202610${(calendarDates.at(-1) ?? 17) + 1}`, details: selectedEvents.map((event) => `${event.title} — ${event.date} Oct, ${event.slot}`).join("\n"), location: "Graphic Era Hill University, Dehradun" })}`;
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (registration.paymentStatus !== "PENDING") return;
    const timer = window.setInterval(() => { void onRefresh(); }, 30000);
    return () => window.clearInterval(timer);
  }, [onRefresh, registration.paymentStatus]);
  async function refresh() { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }
  const approved = registration.paymentStatus === "APPROVED" && registration.pdfStatus === "READY" && Boolean(registration.pdfUrl);
  const pending = registration.paymentStatus === "PENDING";
  const rejected = registration.paymentStatus === "REJECTED";
  const paymentLabel = approved ? "Registration Confirmed" : rejected ? "Payment verification failed" : "Payment Verification Pending";
  const pdfLabel = approved ? "Pass Available" : "PDF Not Ready";
  return <div className={styles.confirmation}>
     <div className={styles.successIcon}><Icon name={approved ? "verified" : rejected ? "error" : "schedule"} /></div><p className={styles.stepLabel}>{paymentLabel}</p><h3>{approved ? "Registration Confirmed" : rejected ? "Payment verification failed" : "Payment Verification Pending"}</h3><p>{approved ? "Your approved pass is available to view or download." : rejected ? registration.remarks || "The payment proof was rejected. Contact the organizer desk for assistance." : "Your payment screenshot is queued for administrator verification. The pass will become available after approval."}</p>
      <dl className={styles.confirmationSummary}><div><dt>Registration ID:</dt><dd>{registration.id}</dd></div><div><dt>Registered Candidate:</dt><dd>{participant.name} ({participant.enrollment})</dd></div><div><dt>Event Details:</dt><dd>{selectedEvents.map((event) => { const official = frontendEventById.get(event.id); return `${event.title} · ${official?.officialDate ?? `${event.date} Oct`} · ${official?.officialVenue ?? event.venue}`; }).join(" + ")}</dd></div><div><dt>Payment Status:</dt><dd>{paymentLabel}</dd></div><div><dt>Screenshot:</dt><dd>RECEIVED</dd></div><div><dt>Pass Status:</dt><dd>{pdfLabel}</dd></div><div><dt>Official Venue:</dt><dd>GEHU Clement Town Campus, Dehradun</dd></div>{rejected && <div><dt>Remarks:</dt><dd>{registration.remarks || "No remarks provided."}</dd></div>}</dl>
     {pending && <p className={styles.statusNote} role="status">Payment Verification Pending · PDF Not Ready</p>}
     <div className={styles.confirmationActions}>{approved && <a className={styles.nextButton} href={registration.pdfUrl!}><Icon name="file_download" />Download Registration PDF</a>}{registration.paymentStatus === "PENDING" && <button type="button" className={styles.backButton} onClick={() => void refresh()} disabled={refreshing}><Icon name="refresh" />{refreshing ? "Checking Status…" : "Refresh Status"}</button>}{registration.paymentStatus !== "REJECTED" && <a className={styles.backButton} href={calendarUrl} target="_blank" rel="noopener noreferrer"><Icon name="calendar_add_on" />Add to Calendar</a>}<button type="button" className={styles.textButton} onClick={onReset}>Return to Portal Home</button></div>
  </div>;
}
