"use client";

import { useRef, useState } from "react";
import { frontendCurrency, frontendEvents, preEventReporting, type FrontendEvent } from "@/lib/frontend-events";
import { Icon } from "./Icon";
import { SelectEventButton } from "./SelectEventButton";
import styles from "./Portal.module.css";

const esportsEvents = new Set(frontendEvents.filter((event) => event.isEsports).map((event) => event.id));
const technicalEvents = new Set(["cp", "ctf"]);

const filters = [
  { id: "all", label: "All Events", count: frontendEvents.length },
  { id: "day1", label: "Day 1", count: frontendEvents.filter((event) => event.officialDay === 1).length },
  { id: "day2", label: "Day 2", count: frontendEvents.filter((event) => event.officialDay === 2).length },
  { id: "solo", label: "Solo" },
  { id: "team", label: "Team" },
  { id: "esports", label: "Esports" },
  { id: "technical", label: "Technical" },
] as const;

function EventCard({ event, onDetails }: { event: FrontendEvent; onDetails: () => void }) {
  return (
    <article className={styles.eventCard}>
      <div>
        <div className={styles.eventCardTop}><div className={styles.eventIcon}><Icon name={event.icon} /></div><span className={styles.eventDate}>{event.officialDate} • {event.officialStage}</span></div>
        <h3>{event.title}</h3><p className={styles.eventDescription}>{event.description}</p>
        <dl className={styles.eventDetails}>
          <div><dt>Start:</dt><dd className={styles.eventTime}>{event.officialTime}</dd></div>
          <div><dt>Format:</dt><dd className={event.officialMode.startsWith("Individual") ? styles.individualMode : styles.teamMode}>{event.officialMode}</dd></div>
          <div><dt>Venue:</dt><dd>{event.officialVenue}</dd></div>
        </dl>
        <div className={styles.eventHosts}><span>Hosts</span><p>{event.hosts.join(" · ")}</p></div>
      </div>
      <div className={styles.eventCardBottom}><p className={styles.eventCardFee}>{frontendCurrency(event.officialFee)}</p><div><button className={styles.detailsButton} type="button" onClick={onDetails}>Details<span className="sr-only"> for {event.title}</span></button><SelectEventButton className={styles.cardSelect} id={event.id}>Select<span className="sr-only"> {event.title}</span></SelectEventButton></div></div>
    </article>
  );
}

export function EventsCatalog() {
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<FrontendEvent>(frontendEvents[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  const displayedEvents = frontendEvents.filter((event) => {
    if (filter === "all") return true;
    if (filter === "day1") return event.officialDay === 1;
    if (filter === "day2") return event.officialDay === 2;
    if (filter === "solo") return event.officialMode.startsWith("Individual");
    if (filter === "team") return !event.officialMode.startsWith("Individual");
    if (filter === "esports") return esportsEvents.has(event.id);
    return technicalEvents.has(event.id);
  });

  function openDetails(event: FrontendEvent) {
    setDetail(event);
    dialog.current?.showModal();
  }

  return (
    <section id="events" className={`${styles.container} ${styles.cyberSection}`} aria-labelledby="events-title">
      <div className={styles.catalogHeading}>
        <div><span className={styles.eyebrow}>Battle Matrix &amp; Tracks</span><h2 className={styles.cyberHeading} id="events-title">10 Competition Signals</h2><p className={styles.catalogDescription}>Review each sanctioned track, timing, venue, and participation mode before selecting a registration slot.</p></div>
        <div className={styles.tabs} role="group" aria-label="Filter competitions">{filters.map((item) => <button className={filter === item.id ? styles.activeTab : ""} key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} type="button">{item.label}{"count" in item ? ` (${item.count})` : ""}</button>)}</div>
      </div>
      <div className={styles.eventsGrid}>{displayedEvents.map((event) => <EventCard key={event.id} event={event} onDetails={() => openDetails(event)} />)}</div>
      <dialog ref={dialog} className={styles.eventModal} aria-labelledby="event-dialog-title" onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <button className={styles.modalClose} type="button" onClick={() => dialog.current?.close()} aria-label="Close event details"><Icon name="close" /></button>
        <div className={styles.eventIcon}><Icon name={detail.icon} /></div>
         <p className={styles.eyebrow}>{detail.officialDate} • {detail.officialStage}</p>
         <h2 className={styles.cyberHeading} id="event-dialog-title">{detail.title}</h2><p>{detail.description}</p>
         <dl className={styles.eventDetails}><div><dt>Starting time</dt><dd>{detail.officialTime}</dd></div><div><dt>Format</dt><dd>{detail.officialMode}</dd></div><div><dt>Venue</dt><dd>{detail.officialVenue}</dd></div><div><dt>Registration fee</dt><dd>{frontendCurrency(detail.officialFee)}</dd></div></dl>
         <div className={styles.modalHosts}><span>Hosts</span><p>{detail.hosts.join(" · ")}</p></div>
          {detail.officialDay === 1 && <div className={styles.reportingNotice}><Icon name="location_on" /><p><strong>Pre-event reporting:</strong> All participants and teams must report to {preEventReporting} before their respective event.</p></div>}
        <p className={styles.modalNote}>Check the master schedule before choosing your events. Overlapping time slots cannot be registered together.</p>
        <div onClick={() => dialog.current?.close()}><SelectEventButton className={`${styles.button} ${styles.primaryButton}`} id={detail.id}>Select for Registration <Icon name="arrow_forward" /></SelectEventButton></div>
      </dialog>
    </section>
  );
}
