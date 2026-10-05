import type { Metadata } from "next";
import portalStyles from "@/components/Portal.module.css";
import styles from "@/components/admin/Admin.module.css";

export const metadata: Metadata = { title: "Payment Review | technIEEEks’26", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${portalStyles.portal} ${portalStyles.cyber}`}><main className={styles.shell}><div className={styles.topbar}><span className={portalStyles.wordmark}>technIEEEks’26 <span className={portalStyles.phaseBadge}>Phase 3</span></span><a href="/" className={portalStyles.eyebrow}>Return to Public Portal</a></div>{children}</main></div>;
}
