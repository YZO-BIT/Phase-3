"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { currency } from "@/lib/events";
import type { AdminRegistrationSummary, Participant, RegistrationView, TeamMember } from "@/lib/registration-data";
import formStyles from "../registration/Registration.module.css";
import styles from "./Admin.module.css";
import { RegistrationCard } from "./RegistrationCard";

type EventCount = { eventId: string; title: string; dates: string; count: number };
type Registry = {
  registrations: AdminRegistrationSummary[];
  statistics: { total: number; pending: number; approved: number; rejected: number; pdfs: number };
  eventCounts: EventCount[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};
type Details = { registration: RegistrationView; participant: Participant; members: TeamMember[]; utr: string };
const statisticsLabels = { total: "Total Registrations", pending: "Pending Payments", approved: "Approved Payments", rejected: "Rejected Payments", pdfs: "PDFs Generated" };

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) { window.location.assign("/admin/login"); throw new Error("Your admin session has expired. Please sign in again."); }
  if (!response.ok) throw new Error(body.error || "The administrator request failed.");
  return body as T;
}

function paymentLabel(registration: RegistrationView) {
  if (registration.paymentMethod === "OFFLINE" && registration.paymentStatus === "PENDING") return "Offline Payment — Pending Verification";
  return `${registration.paymentMethod === "OFFLINE" ? "Offline" : "Online"} Payment — ${registration.paymentStatus}`;
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [eventId, setEventId] = useState("");
  const [day, setDay] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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
    const query = new URLSearchParams({ status, page: String(page), pageSize: "25" });
    if (eventId) query.set("eventId", eventId);
    if (day) query.set("day", day);
    if (search.trim()) query.set("search", search.trim());
    try { setRegistry(await api<Registry>(`/api/admin/registrations?${query}`)); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not load registrations."); }
    finally { setLoading(false); }
  }, [day, eventId, page, search, status]);
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!details) return;
    const controller = new AbortController();
    let objectUrl = "";
    setProofReady(details.registration.paymentMethod === "OFFLINE");
    setProofUrl("");
    if (details.registration.paymentMethod === "OFFLINE") return () => controller.abort();
    fetch(`/api/registrations/${encodeURIComponent(details.registration.id)}/proof`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || "Payment screenshot could not be loaded."); }
        const blob = await response.blob();
        if (blob.type !== "image/png" || !blob.size) throw new Error("The stored screenshot is unavailable.");
        if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setProofUrl(objectUrl); }
      })
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Payment screenshot could not be loaded."); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [details?.registration.id, details?.registration.paymentMethod]);

  async function openDetails(id: string) {
    if (decisionInFlight.current) return;
    const version = ++detailsVersion.current;
    setBusy(true); setError(""); setNotice("");
    try {
      const body = await api<Details>(`/api/admin/registrations/${encodeURIComponent(id)}`);
      if (version !== detailsVersion.current) return;
      setDetails(body); setRemarks(body.registration.remarks);
      window.setTimeout(() => { detailsPanel.current?.focus(); detailsPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 0);
    } catch (requestError) { if (version === detailsVersion.current) setError(requestError instanceof Error ? requestError.message : "Could not load registration details."); }
    finally { if (version === detailsVersion.current) setBusy(false); }
  }

  async function decide(decision: "APPROVE" | "REJECT") {
    if (!details || decisionInFlight.current) return;
    if (decision === "REJECT" && !remarks.trim()) { setError("Enter an admin remark explaining the rejection."); return; }
    decisionInFlight.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const registration = await api<RegistrationView>(`/api/admin/registrations/${encodeURIComponent(details.registration.id)}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, remarks: remarks.trim() }) });
      setDetails({ ...details, registration });
      setNotice(decision === "APPROVE" ? "Payment approved. The PDF is ready and the existing Google Sheet row has been updated." : "Payment rejected. The existing Google Sheet row has been updated; no PDF is available.");
      await refresh();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Payment verification could not be confirmed."); }
    finally { decisionInFlight.current = false; setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await api("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Sign out failed."); setBusy(false); }
  }

  function resetFilters() { setStatus("ALL"); setEventId(""); setDay(""); setSearch(""); setPage(1); }
  const visible = registry?.registrations ?? [];
  const grouped = registry?.eventCounts.filter((item) => !eventId || item.eventId === eventId).map((item) => ({ ...item, registrations: visible.filter((registration) => registration.eventIds.includes(item.eventId)) })) ?? [];

  return <>
    <div className={styles.heading}><div><p className={formStyles.stepLabel}>IEEE SB GEHU • Manual Payment Verification</p><h1>Registration Review</h1><p>Signed in as {adminEmail}</p></div><div className={styles.actions}><button className={formStyles.backButton} type="button" disabled={loading || busy} onClick={() => void refresh()}>Refresh Registrations</button><button className={formStyles.backButton} type="button" disabled={busy} onClick={() => void logout()}>Sign Out</button></div></div>
    {registry && <dl className={styles.statistics}>{(Object.keys(statisticsLabels) as Array<keyof Registry["statistics"]>).map((key) => <div key={key}><dt>{statisticsLabels[key]}</dt><dd>{registry.statistics[key]}</dd></div>)}</dl>}
    {error && <p role="alert" className={formStyles.submitError}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <div className={styles.filters} role="group" aria-label="Filter registrations">
      {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((value) => <button key={value} type="button" aria-pressed={status === value} className={status === value ? formStyles.nextButton : formStyles.backButton} disabled={busy} onClick={() => { setStatus(value); setPage(1); }}>{value === "ALL" ? "All Registrations" : value}</button>)}
      <label className={styles.filterField}>Event<select value={eventId} disabled={busy} onChange={(event) => { setEventId(event.target.value); setPage(1); }}><option value="">All events</option>{registry?.eventCounts.map((item) => <option key={item.eventId} value={item.eventId}>{item.title}</option>)}</select></label>
      <label className={styles.filterField}>Scheduled day<select value={day} disabled={busy} onChange={(event) => { setDay(event.target.value); setPage(1); }}><option value="">All days</option><option value="16">16 October</option><option value="17">17 October</option><option value="19">19 October</option></select></label>
      <label className={styles.filterField}>Search<input value={search} disabled={busy} maxLength={100} placeholder="Name, email, or registration ID" onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
      <button className={formStyles.backButton} type="button" disabled={busy} onClick={resetFilters}>Reset Filters</button>
    </div>
    {registry && <div className={styles.eventCounts} aria-label="Event registration counts">{registry.eventCounts.map((item) => <button type="button" key={item.eventId} className={eventId === item.eventId ? styles.activeEventCount : ""} onClick={() => { setEventId(item.eventId); setPage(1); }}><strong>{item.count}</strong><span>{item.title}</span><small>{item.dates} October</small></button>)}</div>}
    {loading && <p role="status">Loading registrations from Google Sheets…</p>}
    {!loading && registry && !visible.length && <p className={styles.empty}>No registrations match the selected filters.</p>}
    {!loading && registry && visible.length > 0 && <div className={styles.eventSections}>{grouped.filter((section) => section.registrations.length > 0).map((section) => <section key={section.eventId} aria-labelledby={`event-${section.eventId}`}><div className={styles.eventSectionHeading}><h2 id={`event-${section.eventId}`}>{section.title}</h2><span>{section.count} total</span></div><div className={styles.registrations}>{section.registrations.map((registration) => <RegistrationCard key={`${section.eventId}-${registration.id}`} registration={registration} disabled={busy} onOpen={(id) => void openDetails(id)} />)}</div></section>)}</div>}
    {registry && registry.pagination.totalPages > 1 && <div className={styles.pagination}><button className={formStyles.backButton} type="button" disabled={busy || registry.pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {registry.pagination.page} of {registry.pagination.totalPages} · {registry.pagination.total} matches</span><button className={formStyles.backButton} type="button" disabled={busy || registry.pagination.page >= registry.pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
    {details && <div ref={detailsPanel} tabIndex={-1} className={`${formStyles.registryPanel} ${styles.review}`} aria-label={`Payment review for ${details.registration.id}`}>
      <p className={formStyles.stepLabel}>{details.registration.id} • {paymentLabel(details.registration)}</p><h2>Payment Review</h2>
      <div className={styles.reviewGrid}><div><h3>{details.registration.paymentMethod === "OFFLINE" ? "Offline Payment Verification" : "Uploaded Payment Screenshot"}</h3>{details.registration.paymentMethod === "OFFLINE" ? <p className={styles.offlineNotice}>Offline Payment requires no UTR or screenshot. Verify the payment at the authorized desk before approving.</p> : proofUrl ? <><img className={styles.proof} src={proofUrl} alt={`Uploaded payment screenshot for ${details.registration.id}`} onLoad={() => setProofReady(true)} onError={() => { setProofReady(false); setError("The payment screenshot could not be displayed."); }} /><a className={formStyles.textButton} href={proofUrl} target="_blank" rel="noopener noreferrer">Open Full Screenshot</a></> : <p role="status">Loading private screenshot…</p>}</div>
        <div><h3>Registration Details</h3><dl className={styles.details}>{[["Participant / Captain", details.participant.name], ["Student ID", details.participant.enrollment], ["Email", details.participant.email], ["Phone", details.participant.phone], ["College", details.participant.college], ["City", details.participant.city], ["Course / Department", details.participant.branch === "Other" ? details.participant.otherCourse : details.participant.branch], ["Year", details.participant.year], ["Team", details.registration.teamName || "Individual"], ["Team Size", details.registration.teamSize], ["Events", details.registration.eventNames], ["Event Dates", details.registration.eventDates], ["Event Times", details.registration.eventTimes], ["Payment Method", details.registration.paymentMethod === "OFFLINE" ? "Offline Payment" : "Online Payment"], ["Payment Amount", currency(details.registration.amount)], ["Bank Reference / UTR", details.utr || (details.registration.paymentMethod === "OFFLINE" ? "Not required (Offline Payment)" : "Unavailable")], ["Payment Status", details.registration.paymentStatus], ["PDF Status", details.registration.pdfStatus]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {details.members.length > 0 && <><h3>Team Roster</h3><ul className={styles.roster}>{details.members.map((member) => <li key={member.enrollment}><strong>{member.name}</strong><span>{member.enrollment} • {member.email} • {member.phone}</span></li>)}</ul></>}
        </div></div>
      {details.registration.paymentStatus === "PENDING" ? <><p>{details.registration.paymentMethod === "OFFLINE" ? "Confirm the offline payment and amount against the authorized desk record before approving." : "Compare the payment method, amount, bank reference, and payment record before approving."}</p><div className={formStyles.field}><label htmlFor="admin-remarks">Admin Remarks (required to reject)</label><textarea id="admin-remarks" rows={3} value={remarks} maxLength={500} disabled={busy} onChange={(event) => setRemarks(event.target.value)} /></div><div className={styles.actions}><button type="button" className={formStyles.nextButton} disabled={busy || !proofReady} onClick={() => void decide("APPROVE")}>{busy ? "Processing…" : "Approve Payment"}</button><button type="button" className={formStyles.backButton} disabled={busy} onClick={() => void decide("REJECT")}>Reject Payment</button></div></> : <><p>Verified by {details.registration.verifiedBy} on {details.registration.verifiedAt}. {details.registration.remarks}</p>{details.registration.paymentStatus === "APPROVED" && details.registration.pdfStatus === "READY" && details.registration.pdfUrl && <a href={details.registration.pdfUrl} className={formStyles.nextButton}>Download Approved PDF</a>}</>}
      {error && <p role="alert" className={formStyles.submitError}>{error}</p>}
    </div>}
  </>;
}
