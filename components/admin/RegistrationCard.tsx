import { currency } from "../../lib/events";
import type { AdminRegistrationSummary } from "../../lib/registration-data";
import { Icon } from "../Icon";
import formStyles from "../registration/Registration.module.css";
import styles from "./Admin.module.css";

function paymentLabel(registration: AdminRegistrationSummary) {
  if (registration.paymentMethod === "OFFLINE" && registration.paymentStatus === "PENDING") return "Offline Payment — Pending Verification";
  return `${registration.paymentMethod === "OFFLINE" ? "Offline" : "Online"} Payment — ${registration.paymentStatus}`;
}

export function RegistrationCard({ registration, onOpen, disabled = false }: { registration: AdminRegistrationSummary; onOpen: (id: string) => void; disabled?: boolean }) {
  return <article className={formStyles.registryPanel}>
    <p className={formStyles.stepLabel}>{registration.id} • {paymentLabel(registration)}</p><h3>{registration.teamName || registration.participantName}</h3><p>{registration.eventNames}</p>
    <dl className={styles.details}>
      <div><dt>Event Date</dt><dd>{registration.eventDates}</dd></div><div><dt>Scheduled Time</dt><dd>{registration.eventTimes}</dd></div>
      <div><dt>Captain</dt><dd>{registration.participantName}</dd></div><div><dt>Email</dt><dd>{registration.email}</dd></div>
      <div><dt>Phone</dt><dd>{registration.phone}</dd></div><div><dt>College</dt><dd>{registration.college}</dd></div>
      <div><dt>Academic Year</dt><dd>{registration.academicYear || "Not provided"}</dd></div>
      <div><dt>Payment Method</dt><dd>{registration.paymentMethod === "OFFLINE" ? "Offline Payment" : "Online Payment"}</dd></div>
      <div><dt>Payment Amount</dt><dd>{currency(registration.amount)}</dd></div>
      <div><dt>Registration Date</dt><dd>{new Date(registration.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd></div>
    </dl>
    <button type="button" className={formStyles.backButton} disabled={disabled} onClick={() => onOpen(registration.id)}><Icon name="visibility" />View Payment &amp; Details</button>
  </article>;
}
