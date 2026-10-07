"use client";

import { useCallback, useRef, useState } from "react";
import { currency } from "@/lib/events";
import type { RegistrationView } from "@/lib/registration-data";
import { Icon } from "../Icon";
import { ParticipantFields, type Participant } from "./ParticipantFields";
import { EventSelection, ConflictNotice } from "./EventSelection";
import { Confirmation, Payment, Review, TeamFields, type TeamMember } from "./RegistrySteps";
import { useEventSelection } from "./useEventSelection";
import portalStyles from "../Portal.module.css";
import styles from "./Registration.module.css";

const steps = [
  ["Your Details", "Primary information"], ["Choose Events", "Tracks & conflict guard"], ["Team Details", "Squad information"],
  ["Review", "Verification"], ["Payment", "UPI settlement"], ["Confirmation", "Registration status"],
];
const editorialSteps = ["Personal Record", "Select Events", "Team Roster", "Audit Summary", "Gateway Payment", "Dossier Pass"];
const stepTitles = ["Your Details", "Choose Events (Conflict Guard Active)", "Team Details", "Review & Verification", "Payment", "Confirmation"];

const emptyParticipant: Participant = {
  name: "", enrollment: "", email: "", phone: "", college: "", city: "", branch: "CSE (Core)", year: "3rd Year",
};

function useParticipant(initial: Participant) {
  const [participant, setParticipant] = useState(initial);
  const update = (field: keyof Participant, value: string) => setParticipant((current) => ({ ...current, [field]: value }));
  return { participant, update };
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => { const random = Math.random() * 16 | 0; return (character === "x" ? random : random & 3 | 8).toString(16); });
}

function useRegistrationSubmit({ participant, eventIds, teamName, members, utr, agreements, amount }: { participant: Participant; eventIds: string[]; teamName: string; members: TeamMember[]; utr: string; agreements: { authentic: boolean; conduct: boolean }; amount: number }) {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [registration, setRegistration] = useState<RegistrationView | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(newIdempotencyKey);

  const submit = useCallback(async () => {
    if (!screenshot) { setSubmitError("Payment screenshot required before registration can be submitted."); return false; }
    setSubmitting(true);
    setSubmitError("");
    const form = new FormData();
    const completeMembers = members.filter((member) => Object.values(member).some((value) => value.trim()));
    form.set("data", JSON.stringify({ participant, eventIds, teamName: teamName.trim(), members: completeMembers, utr: utr.trim(), amount, agreements, idempotencyKey }));
    form.set("screenshot", screenshot, screenshot.name);
    try {
      const response = await fetch("/api/registrations", { method: "POST", body: form, credentials: "same-origin" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Registration could not be submitted.");
      setRegistration(body as RegistrationView);
      return true;
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "Registration could not be submitted.");
      return false;
    } finally { setSubmitting(false); }
  }, [agreements, amount, eventIds, idempotencyKey, members, participant, screenshot, teamName, utr]);

  const refreshStatus = useCallback(async () => {
    if (!registration) return;
    try {
      const response = await fetch(`/api/registrations/${encodeURIComponent(registration.id)}`, { credentials: "same-origin", cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Registration status could not be refreshed.");
      setRegistration(body as RegistrationView);
      setSubmitError("");
    } catch (error: unknown) { setSubmitError(error instanceof Error ? error.message : "Registration status could not be refreshed."); }
  }, [registration]);

  return { screenshot, setScreenshot, registration, submitError, submitting, submit, refreshStatus, reset: () => { setRegistration(null); setSubmitError(""); setScreenshot(null); } };
}

export function EditorialRegistration() {
  const { participant, update } = useParticipant({ ...emptyParticipant, branch: "Computer Science & Engineering", year: "3rd Year (Class of 2027)" });
  const selection = useEventSelection(["cp"]);
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [utr, setUtr] = useState("");
  const [agreements, setAgreements] = useState({ authentic: true, conduct: true });
  const flow = useRegistrationSubmit({ participant, eventIds: selection.selectedIds, teamName, members, utr, agreements, amount: selection.total });

  async function submitRegistration() { if (await flow.submit()) setStep(5); }
  function reset() { flow.reset(); setStep(1); setUtr(""); setTeamName(""); setMembers([]); window.location.hash = "home"; }

  return <section id="register" className={`${portalStyles.section} ${styles.editorialRegistration}`} aria-label="Registration portal">
    <div className={portalStyles.container}>
      <ol className={styles.editorialSteps}>{editorialSteps.map((label, index) => <li key={label} className={index < (step === 1 ? 2 : step + 1) ? styles.currentEditorialStep : ""}><span>Stage {String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></li>)}</ol>
      {step === 1 ? <form method="post" action="" className={styles.editorialForm} onSubmit={(event) => { event.preventDefault(); if (selection.selectedIds.length) setStep(2); }}>
        <div className={styles.delegateFields}><div className={styles.delegateHeading}><div><p>Section 01 of 02</p><h2>Delegate Identification</h2></div><span>* All Mandatory</span></div><ParticipantFields variant="editorial" value={participant} onChange={update} /></div>
        <div className={styles.editorialSelector}>
          <div><div className={styles.selectorHeading}><div><p>Section 02 of 02</p><h2>Target Brackets</h2></div><span>Matrix Active</span></div>
            <ConflictNotice message={selection.conflict} onDismiss={selection.dismissConflict} /><EventSelection variant="editorial" selectedIds={selection.selectedIds} onSelect={selection.select} />
          </div>
          <div className={styles.editorialTotal} aria-live="polite"><div><span>Selected Contests</span><span>{selection.selectedIds.length} {selection.selectedIds.length === 1 ? "Event" : "Events"}</span></div><div><span>Payable Aggregation</span><strong>{currency(selection.total)}</strong></div><button className={styles.nextButton} type="submit" disabled={!selection.selectedIds.length}>Proceed to Team Assignment <Icon name="east" /></button><p>Registration remains pending until an administrator verifies the payment screenshot.</p></div>
        </div>
      </form> : flow.registration ? <Confirmation participant={participant} selectedEvents={selection.selectedEvents} registration={flow.registration} onRefresh={flow.refreshStatus} onReset={reset} /> : <form method="post" action="" className={styles.editorialContinuation} onSubmit={(event) => { event.preventDefault(); if (step === 4) void submitRegistration(); else setStep((current) => Math.min(current + 1, 4)); }}>
        <div className={styles.stepBanner}><h2>{["", "", "Team Roster", "Audit Summary", "Gateway Payment"][step]}</h2><span>Stage {String(step + 1).padStart(2, "0")} / 06</span></div>
        {step === 2 && <TeamFields participant={participant} selectedEvents={selection.selectedEvents} teamName={teamName} setTeamName={setTeamName} members={members} setMembers={setMembers} />}
        {step === 3 && <Review participant={participant} selectedEvents={selection.selectedEvents} total={selection.total} teamName={teamName} members={members} agreements={agreements} setAgreements={setAgreements} />}
        {step === 4 && <Payment total={selection.total} eventIds={selection.selectedIds} utr={utr} setUtr={setUtr} screenshot={flow.screenshot} setScreenshot={flow.setScreenshot} />}
        {flow.submitError && <p role="alert" className={styles.submitError}>{flow.submitError}</p>}
        <div className={styles.stepActions}><button className={styles.backButton} type="button" onClick={() => setStep(step - 1)} disabled={flow.submitting}>Back</button><button className={styles.nextButton} type="submit" disabled={flow.submitting}>{flow.submitting ? "Submitting…" : step === 2 ? "Next: Review Order" : step === 3 ? "Proceed to Payment" : "Submit Registration"}<Icon name="arrow_forward" /></button></div>
      </form>}
    </div>
  </section>;
}

export function CyberRegistration() {
  const [step, setStep] = useState(1);
  const quickSelect = useCallback(() => setStep(2), []);
  const selection = useEventSelection(["cp", "chess"], quickSelect);
  const { participant, update } = useParticipant(emptyParticipant);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [utr, setUtr] = useState("");
  const [agreements, setAgreements] = useState({ authentic: true, conduct: true });
  const [selectionError, setSelectionError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const flow = useRegistrationSubmit({ participant, eventIds: selection.selectedIds, teamName, members, utr, agreements, amount: selection.total });

  function goToStep(target: number) {
    if (target > step && !form.current?.reportValidity()) return;
    if (target > 2 && !selection.selectedIds.length) { setSelectionError("Select at least one event to continue."); setStep(2); return; }
    setSelectionError("");
    setStep(target);
  }
  async function submitRegistration() { if (await flow.submit()) setStep(6); }
  function reset() { flow.reset(); setStep(1); setUtr(""); setTeamName(""); setMembers([]); window.location.hash = "home"; }

  return <section id="register" className={`${portalStyles.container} ${portalStyles.cyberSection} ${styles.cyberRegistration}`} aria-labelledby="registration-title">
    <div className={styles.engine}>
      <div className={styles.engineHeader}><div><p className={portalStyles.eyebrow}><span className={portalStyles.statusDot} />IEEE SB GEHU Registry v3.4</p><h2 id="registration-title" className={portalStyles.cyberHeading}>Festival Registration Engine</h2></div><span className={styles.engineStatus}>Status: <strong>Open for Submissions</strong></span></div>
      <ol className={styles.wizardSteps}>{steps.map(([label, subtitle], index) => <li key={label} className={step === index + 1 ? styles.activeStep : index + 1 < step ? styles.completedStep : ""}><button type="button" aria-current={step === index + 1 ? "step" : undefined} disabled={index === 5 && step < 6} onClick={() => goToStep(index + 1)}><span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span><span className={styles.stepText}><strong>{label}</strong><span>{subtitle}</span></span></button></li>)}</ol>
      <ConflictNotice message={selection.conflict} onDismiss={selection.dismissConflict} />
      {flow.registration ? <Confirmation participant={participant} selectedEvents={selection.selectedEvents} registration={flow.registration} onRefresh={flow.refreshStatus} onReset={reset} /> : <form ref={form} method="post" action="" onSubmit={(event) => { event.preventDefault(); if (step === 5) void submitRegistration(); else goToStep(Math.min(step + 1, 5)); }}>
        {step < 6 && <div className={styles.stepBanner}><span>Step {String(step).padStart(2, "0")} / 06 — {stepTitles[step - 1]}</span><span>{step === 1 ? "Fields marked with (*) are required" : step === 2 ? "Overlapping slots are auto-restricted" : step === 3 ? "Required only if squad events are selected" : step === 4 ? "Check accuracy before finalizing" : "Payment screenshot is mandatory"}</span></div>}
        {step === 1 && <ParticipantFields variant="cyber" value={participant} onChange={update} />}
        {step === 2 && <><EventSelection variant="cyber" selectedIds={selection.selectedIds} onSelect={selection.select} /><div className={styles.selectionSummary} aria-live="polite"><span>{selection.selectedIds.length} Events Selected</span><strong>Total: {currency(selection.total)}.00</strong></div>{selectionError && <p role="alert" className={styles.fileError}>{selectionError}</p>}</>}
        {step === 3 && <TeamFields participant={participant} selectedEvents={selection.selectedEvents} teamName={teamName} setTeamName={setTeamName} members={members} setMembers={setMembers} />}
        {step === 4 && <Review participant={participant} selectedEvents={selection.selectedEvents} total={selection.total} teamName={teamName} members={members} agreements={agreements} setAgreements={setAgreements} />}
        {step === 5 && <Payment total={selection.total} eventIds={selection.selectedIds} utr={utr} setUtr={setUtr} screenshot={flow.screenshot} setScreenshot={flow.setScreenshot} />}
        {flow.submitError && <p role="alert" className={styles.submitError}>{flow.submitError}</p>}
        {step < 6 && <div className={styles.stepActions}>{step > 1 && <button className={styles.backButton} type="button" onClick={() => goToStep(step - 1)} disabled={flow.submitting}>Back</button>}<button className={styles.nextButton} type="submit" disabled={flow.submitting}>{flow.submitting ? "Submitting…" : ["", "Next: Select Events", "Next: Team Details", "Next: Review Order", "Proceed to Payment", "Submit Registration"][step]}<Icon name={step === 4 ? "payments" : step === 5 ? "verified" : "arrow_forward"} /></button></div>}
      </form>}
    </div>
  </section>;
}
