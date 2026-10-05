"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { currency } from "@/lib/events";
import type { Participant, RegistrationView, TeamMember } from "@/lib/registration-data";
import { Icon } from "../Icon";
import formStyles from "../registration/Registration.module.css";
import styles from "./Admin.module.css";

type Registry = { registrations: RegistrationView[]; statistics: { total: number; pending: number; approved: number; rejected: number; pdfs: number } };
type Details = { registration: RegistrationView; participant: Participant; members: TeamMember[]; utr: string };
const statisticsLabels = { total: "Total Registrations", pending: "Pending Payments", approved: "Approved Payments", rejected: "Rejected Payments", pdfs: "PDFs Generated" };

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign("/admin/login"); throw new Error("Your admin session has expired. Please sign in again."); }
  if (!response.ok) throw new Error(body.error || "The administrator request failed.");
  return body as T;
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [details, setDetails] = useState<Details | null>(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [proofReady, setProofReady] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const decisionInFlight = useRef(false);
  const detailsVersion = useRef(0);
  const detailsPanel = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setRegistry(await api<Registry>("/api/admin/registrations")); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load registrations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!details) return;
    const controller = new AbortController();
    let objectUrl = "";
    setProofReady(false);
    setProofUrl("");
    fetch(`/api/registrations/${encodeURIComponent(details.registration.id)}/proof`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || "Payment screenshot could not be loaded."); }
        const blob = await response.blob();
        if (blob.type !== "image/png" || !blob.size) throw new Error("The stored screenshot is unavailable.");
        if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setProofUrl(objectUrl); }
      })
      .catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Payment screenshot could not be loaded."); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [details?.registration.id]);

  async function openDetails(id: string) {
    if (decisionInFlight.current) return;
    const version = ++detailsVersion.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = await api<Details>(`/api/admin/registrations/${encodeURIComponent(id)}`);
      if (version !== detailsVersion.current) return;
      setDetails(body);
      setRemarks(body.registration.remarks);
      window.setTimeout(() => { detailsPanel.current?.focus(); detailsPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0);
    } catch (error) { if (version === detailsVersion.current) setError(error instanceof Error ? error.message : "Could not load registration details."); }
    finally { if (version === detailsVersion.current) setBusy(false); }
  }

  async function decide(decision: "APPROVE" | "REJECT") {
    if (!details || decisionInFlight.current) return;
    if (decision === "REJECT" && !remarks.trim()) { setError("Enter an admin remark explaining the rejection."); return; }
    decisionInFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const registration = await api<RegistrationView>(`/api/admin/registrations/${encodeURIComponent(details.registration.id)}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, remarks: remarks.trim() }) });
      setDetails({ ...details, registration });
      setNotice(decision === "APPROVE" ? "Payment approved. The PDF is ready and the existing Google Sheet row has been updated." : "Payment rejected. The existing Google Sheet row has been updated; no PDF is available.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Payment verification could not be confirmed."); }
    finally { decisionInFlight.current = false; setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await api("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Sign out failed."); setBusy(false); }
  }

  const visible = registry?.registrations.filter((registration) => filter === "ALL" || registration.paymentStatus === filter) ?? [];
  return <>
    <div className={styles.heading}><div><p className={formStyles.stepLabel}>IEEE SB GEHU • Manual Payment Verification</p><h1>Registration Review</h1><p>Signed in as {adminEmail}</p></div><div className={styles.actions}><button className={formStyles.backButton} type="button" disabled={loading || busy} onClick={() => void refresh()}>Refresh Registrations</button><button className={formStyles.backButton} type="button" disabled={busy} onClick={() => void logout()}>Sign Out</button></div></div>
    {registry && <dl className={styles.statistics}>{(Object.keys(statisticsLabels) as Array<keyof Registry["statistics"]>).map((key) => <div key={key}><dt>{statisticsLabels[key]}</dt><dd>{registry.statistics[key]}</dd></div>)}</dl>}
    {error && <p role="alert" className={formStyles.submitError}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <div className={styles.filters} role="group" aria-label="Filter payment status">{["PENDING", "APPROVED", "REJECTED", "ALL"].map((status) => <button key={status} type="button" aria-pressed={filter === status} className={filter === status ? formStyles.nextButton : formStyles.backButton} disabled={busy} onClick={() => setFilter(status)}>{status === "ALL" ? "All Registrations" : status}</button>)}</div>
    {loading && <p role="status">Loading registrations from Google Sheets…</p>}
    {!loading && registry && !visible.length && <p className={styles.empty}>No {filter === "ALL" ? "" : filter.toLowerCase()} registrations.</p>}
    <div className={styles.registrations}>{visible.map((registration) => <article key={registration.id} className={formStyles.registryPanel}>
      <p className={formStyles.stepLabel}>{registration.id} • {registration.paymentStatus}</p><h2>{registration.teamName || registration.participantName}</h2><p>{registration.eventNames}</p>
      <dl className={styles.details}><div><dt>Event Date</dt><dd>{registration.eventDates}</dd></div><div><dt>Start Time</dt><dd>{registration.eventTimes}</dd></div><div><dt>Captain</dt><dd>{registration.participantName}</dd></div><div><dt>Email</dt><dd>{registration.email}</dd></div><div><dt>Phone</dt><dd>{registration.phone}</dd></div><div><dt>College</dt><dd>{registration.college}</dd></div><div><dt>Payment Amount</dt><dd>{currency(registration.amount)}</dd></div><div><dt>Registration Date</dt><dd>{new Date(registration.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div></dl>
      <button type="button" className={formStyles.backButton} disabled={busy} onClick={() => void openDetails(registration.id)}><Icon name="visibility" />View Payment &amp; Details</button>
    </article>)}</div>
    {details && <div ref={detailsPanel} tabIndex={-1} className={`${formStyles.registryPanel} ${styles.review}`} aria-label={`Payment review for ${details.registration.id}`}>
      <p className={formStyles.stepLabel}>{details.registration.id} • {details.registration.paymentStatus}</p><h2>Payment Review</h2>
      <div className={styles.reviewGrid}><div><h3>Uploaded Payment Screenshot</h3>{proofUrl ? <><img className={styles.proof} src={proofUrl} alt={`Uploaded payment screenshot for ${details.registration.id}`} onLoad={() => setProofReady(true)} onError={() => { setProofReady(false); setError("The payment screenshot could not be displayed."); }} /><a className={formStyles.textButton} href={proofUrl} target="_blank" rel="noopener noreferrer">Open Full Screenshot</a></> : <p role="status">Loading private screenshot…</p>}</div>
        <div><h3>Registration Details</h3><dl className={styles.details}>{[["Participant / Captain", details.participant.name], ["Enrollment", details.participant.enrollment], ["Email", details.participant.email], ["Phone", details.participant.phone], ["College", details.participant.college], ["City", details.participant.city], ["Department / Year", `${details.participant.branch} • ${details.participant.year}`], ["Team", details.registration.teamName || "Individual"], ["Team Size", details.registration.teamSize], ["Events", details.registration.eventNames], ["Event Dates", details.registration.eventDates], ["Event Times", details.registration.eventTimes], ["Payment Amount", currency(details.registration.amount)], ["Bank Reference / UTR", details.utr], ["Payment Status", details.registration.paymentStatus], ["PDF Status", details.registration.pdfStatus]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {details.members.length > 0 && <><h3>Team Roster</h3><ul className={styles.roster}>{details.members.map((member) => <li key={member.enrollment}><strong>{member.name}</strong><span>{member.enrollment} • {member.email} • {member.phone}</span></li>)}</ul></>}
        </div></div>
      {details.registration.paymentStatus === "PENDING" ? <><p>Compare the screenshot, amount, bank reference, and recipient against the actual bank/payment record before approving.</p><div className={formStyles.field}><label htmlFor="admin-remarks">Admin Remarks (required to reject)</label><textarea id="admin-remarks" rows={3} value={remarks} maxLength={500} disabled={busy} onChange={(event) => setRemarks(event.target.value)} /></div><div className={styles.actions}><button type="button" className={formStyles.nextButton} disabled={busy || !proofReady} onClick={() => void decide("APPROVE")}>{busy ? "Processing…" : "Approve Payment"}</button><button type="button" className={formStyles.backButton} disabled={busy} onClick={() => void decide("REJECT")}>Reject Payment</button></div></> : <><p>Verified by {details.registration.verifiedBy} on {details.registration.verifiedAt}. {details.registration.remarks}</p>{details.registration.paymentStatus === "APPROVED" && details.registration.pdfStatus === "READY" && details.registration.pdfUrl && <a href={details.registration.pdfUrl} className={formStyles.nextButton}>Download Approved PDF</a>}</>}
      {error && <p role="alert" className={formStyles.submitError}>{error}</p>}
    </div>}
  </>;
}
