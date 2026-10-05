import Image from "next/image";
import type { PortalVariant } from "@/lib/events";
import { MobileNav } from "./MobileNav";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

export const navigation = [
  { href: "#events", label: "Events" },
  { href: "#schedule", label: "Schedule" },
  { href: "#rules", label: "Rules" },
];

export function Header({ variant }: { variant: PortalVariant }) {
  const cyber = variant === "cyber";
  const links = cyber ? [
    ...navigation.slice(0, 2),
    { href: "#rules", label: "Rules & Notice" },
    { href: "#register", label: "Register Wizard" },
  ] : navigation;

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.institutionLogos} aria-label="Organizing institutions">
          <Image className={styles.ieeeLogo} src="/assets/ieee-gehu-logo.png" alt="IEEE Graphic Era Hill University Student Branch" width={221} height={106} sizes="(max-width: 767px) 63px, 88px" priority />
          <Image className={styles.gehuLogo} src="/assets/gehu-logo.png" alt="Graphic Era Hill University, Dehradun" width={335} height={96} sizes="(max-width: 767px) 108px, 140px" priority />
        </div>
        <a className={styles.brand} href="#home" aria-label="technIEEEks’26 home">
          {cyber && <Image className={styles.logo} src="/assets/technieeeks-logo.png" alt="" width={240} height={54} sizes="(max-width: 1279px) 103px, 143px" priority />}
          <span className={styles.wordmark}>technIEEEks’26</span>
          <span className={styles.phaseBadge}>Phase {cyber ? "3" : "03"}</span>
        </a>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {links.map((link) => <a href={link.href} key={link.href}>{link.label}</a>)}
        </nav>
        <div className={styles.headerActions}>
          {cyber && <span className={styles.activeBadge}><span className={styles.statusDot} />Registrations Active • Oct 2026</span>}
          <a className={styles.headerRegister} href="#register">{cyber ? "Register Now" : "Register"}</a>
          {cyber && <a className={styles.profileButton} href="#register" aria-label="Participant registration"><Icon name="person" /></a>}
          <MobileNav links={links} />
        </div>
      </div>
    </header>
  );
}
