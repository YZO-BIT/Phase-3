import type { PortalVariant } from "@/lib/events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

const editorialStats = [
  ["Total Purse", "₹1,20,000+"], ["Sanctioned Brackets", "10 Contests"],
  ["Host Venue", "Tech Block & Arenas"], ["Governance", "IEEE Code SEC.04"],
];
const cyberStats = [
  ["High-Stakes Events", "10"], ["Intense Arena Days", "02"],
  ["Expected Competitors", "500+"], ["Grand Champion Trophy", "01"],
];

export function Hero({ variant }: { variant: PortalVariant }) {
  const cyber = variant === "cyber";
  if (cyber) return (
    <section id="home" className={`${styles.container} ${styles.cyberHero}`} aria-labelledby="hero-title">
      <div className={styles.heroBadge}><span className={styles.statusDot} />Phase 3 • IEEE SB GEHU • Official Registration Portal</div>
      <h1 id="hero-title" className={styles.cyberHeroTitle}>technIEEEks’26</h1>
      <p className={styles.cyberTagline}>&quot;Think • Play • Strategize • Win.&quot;</p>
      <p className={styles.heroDescription}>A two-day high-octane multi-domain technical symposium &amp; esports arena engineered for university innovators, cybersecurity analysts, strategists, and elite gamers.</p>
      <div className={styles.metadataBar}>
        <div><Icon name="calendar_month" /><span>16 • 17 October 2026</span></div>
        <div><Icon name="pin_drop" /><span>GEHU Campus, Dehradun</span></div>
        <div><Icon name="trophy" /><span>10 Events • ₹1,50,000+ Pool</span></div>
      </div>
      <div className={styles.cyberHeroActions}>
        <a className={`${styles.button} ${styles.primaryButton}`} href="#register">Register Now <Icon name="bolt" /></a>
        <a className={`${styles.button} ${styles.secondaryButton}`} href="#events">Explore 10 Events <Icon name="grid_view" /></a>
        <a className={`${styles.button} ${styles.rulebookButton}`} href="#rules"><Icon name="file_download" />Download Rulebook (PDF)</a>
      </div>
      <div className={styles.cyberStats}>{cyberStats.map(([label, value]) => (
        <div key={label}><strong>{value}</strong><span>{label}</span></div>
      ))}</div>
    </section>
  );

  return (
    <section id="home" className={`${styles.section} ${styles.editorialHero}`} aria-labelledby="hero-title">
      <div className={styles.container}>
        <div className={styles.institutionTag}><span className={styles.square} />IEEE Student Branch • Graphic Era Hill University</div>
        <h1 id="hero-title" className={styles.editorialHeroTitle}>technIEEEks’26</h1>
        <div className={styles.phaseLine}><span>Phase 03</span><span className={styles.invitational}>Autumn Invitational</span></div>
        <div className={styles.heroDatum}>
          <div><p className={styles.eyebrow}>Operational Doctrine</p><p className={styles.editorialTagline}>Think • Play • Strategize • Win.</p></div>
          <div className={styles.heroLocation}>
            <p>16 / 17 October 2026<br />Graphic Era Hill University Campus, Dehradun</p>
            <div className={styles.heroActions}>
              <a className={`${styles.button} ${styles.primaryButton}`} href="#register">Register Dossier <Icon name="arrow_forward" /></a>
              <a className={`${styles.button} ${styles.outlineButton}`} href="#events">Explore 10 Events →</a>
            </div>
          </div>
        </div>
        <div className={styles.editorialStats}>{editorialStats.map(([label, value]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}</div>
      </div>
    </section>
  );
}
