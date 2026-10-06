"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import formStyles from "../registration/Registration.module.css";
import styles from "./Admin.module.css";

export function AdminLogin() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Administrator sign-in failed.");
      setPassword("");
      router.replace("/admin");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Administrator sign-in failed."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <form method="post" action="" className={`${formStyles.registryPanel} ${styles.login}`} onSubmit={(event) => { event.preventDefault(); void login(); }} aria-busy={busy}>
    <p className={formStyles.stepLabel}>IEEE SB GEHU • Authorized Organizers</p>
    <h1>Administrator Sign In</h1>
    <p>Review submitted payment screenshots and verify registrations.</p>
    <div className={formStyles.field}><label htmlFor="admin-email">Administrator Email</label><input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" maxLength={254} required disabled={busy} /></div>
    <div className={formStyles.field}><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" maxLength={256} required disabled={busy} /></div>
    {error && <p role="alert" className={formStyles.submitError}>{error}</p>}
    <button className={formStyles.nextButton} type="submit" disabled={busy}>{busy ? "Signing In…" : "Sign In"}</button>
    <a href="/" className={formStyles.textButton}>Return to the registration portal</a>
  </form>;
}
