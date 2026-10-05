import type { PortalVariant } from "@/lib/events";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { Protocols } from "./Protocols";
import { EventsList } from "./EventsList";
import { EventsCatalog } from "./EventsCatalog";
import { EditorialSchedule } from "./Schedule";
import { CyberSchedule } from "./CyberSchedule";
import { EditorialRegistration, CyberRegistration } from "./registration/Registration";
import { Footer } from "./Footer";
import styles from "./Portal.module.css";

export function Portal({ variant }: { variant: PortalVariant }) {
  const cyber = variant === "cyber";
  return (
    <div className={`${styles.portal} ${cyber ? styles.cyber : styles.editorial}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header variant={variant} />
      <main id="main-content" className={styles.main}>
        <Hero variant={variant} />
        <Protocols variant={variant} />
        {cyber ? <EventsCatalog /> : <EventsList />}
        {cyber ? <CyberSchedule /> : <EditorialSchedule />}
        {cyber ? <CyberRegistration /> : <EditorialRegistration />}
      </main>
      <Footer variant={variant} />
    </div>
  );
}
