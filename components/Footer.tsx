import type { PortalVariant } from "@/lib/events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

export function Footer({ variant }: { variant: PortalVariant }) {
  const cyber = variant === "cyber";
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <div><span className={styles.wordmark}>technIEEEks’26</span>{cyber && <span className={styles.phaseBadge}>Phase 3</span>}</div>
            <p className={styles.footerInstitution}>{cyber ? "IEEE Student Branch Graphic Era Hill University, Dehradun." : "IEEE Student Branch • Graphic Era Hill University"}</p>
            <p className={styles.footerTagline}>{cyber ? '"Think • Play • Strategize • Win."' : "“Think • Play • Strategize • Win.”"}</p>
            {cyber && <p className={styles.footerDescription}>The premier technical symposium and esports arena engineered for university innovators, coders, and system strategists.</p>}
          </div>
          <nav className={styles.footerNav} aria-label="Footer navigation">
            <h2>{cyber ? "Quick Navigation" : "Quick Links"}</h2>
            <a href="#events">{cyber ? "Events Catalog" : "Events"}</a><a href="#schedule">{cyber ? "Tournament Schedule" : "Schedule"}</a><a href="#rules">{cyber ? "Official Rulebook" : "Rules"}</a>
            {cyber ? <><a href="#register">Registration Portal</a><details className={styles.footerFaq}><summary>Frequently Asked Questions</summary><p>Register for multiple events when their time slots do not overlap. A team captain completes the squad registration. For further questions, contact the organizer desk.</p></details></> : <a href="#rules">Rulebook PDF</a>}
          </nav>
          <div className={styles.footerContact}>
            <h2>{cyber ? "Organizer & Desk Contact" : "Desk Contact"}</h2>
            <div>{cyber && <Icon name="badge" />}<div>{cyber && <p className={styles.contactLabel}>Official Support</p>}<a href="mailto:prinskanyal@gmail.com">prinskanyal@gmail.com</a></div></div>
            <div>{cyber && <Icon name="pin_drop" />}<div>{cyber && <p className={styles.contactLabel}>Venue</p>}<p>GEHU Campus, Clement Town{cyber ? ", " : <br />}Dehradun, Uttarakhand, India</p></div></div>
          </div>
          {!cyber && <div className={styles.footerStatus}><span>Phase 03 Active</span><p>© 2026 IEEE SB GEHU.<br /><span>All Rights Reserved.</span></p></div>}
        </div>
        {cyber && <div className={styles.footerBottom}><p>© 2026 IEEE SB GEHU. All rights reserved. Built for engineering &amp; competitive minds.</p><p>Security Cleared <span>•</span> Node Active: Phase 3</p></div>}
      </div>
    </footer>
  );
}
