import type { PortalVariant } from "@/lib/events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

const editorialRules = [
  { tag: "Rule 01 • Overlap Guard", title: "Simultaneous Tracks", text: "The platform executes a real-time slot conflict matrix. Participants are system-locked from selecting concurrent matches (e.g. Competitive Programming and Capture The Flag cannot be simultaneously entered)." },
  { tag: "Rule 02 • Team Delegation", title: "Single Squad Captain", text: "Squad leaders handle complete registry for BGMI, Valorant, Free Fire Max, and Campus Treasure Hunt. Team captain email coordinates match links, room codes, and direct grievance resolution." },
  { tag: "Rule 03 • Identity Verification", title: "Credential Check", text: "Official university roll numbers and institution identity cards are thoroughly validated at stage checkpoints. Proxy substitution results in swift bracket forfeiture and campus notification." },
  { tag: "Rule 04 • Fair Play Canon", title: "IEEE Code Of Ethics", text: "Hardware exploits, external scripting, unauthorized networking packets, or unsporting decorum trigger instantaneous disqualification and permanent blacklist from future IEEE symposium cycles." },
];
const cyberRules = [
  { icon: "timer", title: "Simultaneous Tracks", text: "Some events run concurrently or in overlapping slots. Double registrations during colliding slots are physically barred." },
  { icon: "group_work", title: "Single Team Captain", text: "For squad events (BGMI, CTF, Valorant, Treasure Hunt), only the team lead should initiate and complete squad roster entries." },
  { icon: "schedule", title: "Multi-Event Capability", text: "You may register for as many events as you like as long as their timetable allocations do not intersect." },
  { icon: "badge", title: "Credentials Verification", text: "Ensure university enrollment IDs and institutional emails are 100% genuine. Discrepancies lead to immediate disqualification." },
  { icon: "receipt_long", title: "Dynamic Tier Pricing", text: "The final checkout sum is calculated transparently based on your collective individual and team track selections." },
  { icon: "policy", title: "IEEE Code of Ethics", text: "Unfair exploits, unauthorized scripts in esports, or code plagiarism will trigger immediate banishment." },
];

export function Protocols({ variant }: { variant: PortalVariant }) {
  if (variant === "cyber") return (
    <section id="rules" className={`${styles.container} ${styles.cyberProtocols}`} aria-labelledby="rules-title">
      <div className={styles.noticePanel}>
        <div className={styles.noticeHeading}>
          <div className={styles.noticeTitle}><div className={styles.noticeIcon}><Icon name="gavel" /></div><div><p className={styles.eyebrow}>Security &amp; Compliance Protocol</p><h2 id="rules-title">Before You Register — Essential Protocols</h2></div></div>
          <span className={styles.guardBadge}><Icon name="verified_user" />Conflict Guard Active</span>
        </div>
        <div className={styles.noticeRules}>{cyberRules.map((rule) => (
          <div key={rule.title}><Icon name={rule.icon} /><p><strong>{rule.title}:</strong> {rule.text}</p></div>
        ))}</div>
        <div className={styles.noticeFootnote}><p><Icon name="info" />Our automated real-time conflict detector will block overlapping slot combinations inside the Registration Engine below.</p><a href="#register">Jump to Wizard <Icon name="arrow_downward" /></a></div>
      </div>
    </section>
  );

  return (
    <section id="rules" className={`${styles.section} ${styles.alternateSection}`} aria-labelledby="rules-title">
      <div className={`${styles.container} ${styles.protocolGrid}`}>
        <div className={styles.protocolIntroduction}>
          <div><p className={styles.eyebrow}>Protocol 00</p><h2 id="rules-title" className={styles.largeHeading}>Before You<br />Register</h2></div>
          <p>Mandatory compliance rules established by the technical committee. Read rigorously prior to roster compilation.</p>
        </div>
        <div className={styles.protocolRules}>{editorialRules.map((rule) => (
          <article className={styles.protocolRule} key={rule.title}><div><span className={styles.ruleTag}>{rule.tag}</span><h3>{rule.title}</h3></div><p>{rule.text}</p></article>
        ))}</div>
      </div>
    </section>
  );
}
