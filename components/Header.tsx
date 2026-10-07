import Image from "next/image";
import type { PortalVariant } from "@/lib/events";
import { MobileNav } from "./MobileNav";
import styles from "./Portal.module.css";

export const navigation = [
  { href: "#events", label: "Events" },
  { href: "#schedule", label: "Schedule" },
  { href: "#rules", label: "Rules" },
];

export function Header({ variant }: { variant: PortalVariant }) {
  const links = navigation;

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerIdentity}>
          <a className={styles.universityLogo} href="#home" aria-label="Graphic Era Hill University home">
            <Image src="/assets/gehu-phase03-logo.png" alt="Graphic Era Hill University, Dehradun" width={335} height={96} sizes="(max-width: 767px) 136px, (max-width: 1279px) 180px, 214px" priority />
          </a>
          <span className={styles.headerDivider} aria-hidden="true" />
          <a className={styles.brand} href="#home" aria-label="technIEEEks’26 home">
            <span className={styles.wordmark}>TECHNIEEEKS’26</span>
            <span className={styles.phaseBadge}>PHASE 03</span>
          </a>
        </div>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {links.map((link, index) => <a className={index === 0 ? styles.activeNavLink : undefined} href={link.href} key={link.href}>{link.label}</a>)}
        </nav>
        <div className={styles.headerActions}>
          <span className={styles.headerDivider} aria-hidden="true" />
          <div className={styles.ieeeLockup}>
            <Image src="/assets/ieee-phase03-logo.png" alt="IEEE Graphic Era Hill University Student Branch" width={221} height={106} sizes="(max-width: 1279px) 116px, 150px" priority />
          </div>
          <a className={styles.headerRegister} href="#register"><span>REGISTER</span><span aria-hidden="true">→</span></a>
          <MobileNav links={links} />
        </div>
      </div>
    </header>
  );
}
