"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.mobileNav}>
      <button type="button" className={styles.menuButton} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>
        <Icon name={open ? "close" : "menu"} />
      </button>
      {open && <nav id="mobile-navigation" className={styles.mobileMenu} aria-label="Mobile navigation">
        {links.map((link) => <a href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}
        <a href="#register" onClick={() => setOpen(false)}>Register Now →</a>
      </nav>}
    </div>
  );
}
