"use client";

import { useRef, useState } from "react";
import { currency, events, type FestivalEvent } from "@/lib/events";
import { Icon } from "./Icon";
import { SelectEventButton } from "./SelectEventButton";
import styles from "./Portal.module.css";

const filters = [
  { id: "all", label: "All Events (10)" },
  { id: "day1", label: "Day 1 (5)" },
  { id: "day2", label: "Day 2 (5)" },
  { id: "solo", label: "Solo" },
  { id: "team", label: "Team" },
  { id: "esports", label: "Esports" },
  { id: "technical", label: "Technical" },
];

const esportsEvents = new Set(["bgmi", "ff", "val", "karts", "royale"]);
const technicalEvents = new Set(["cp", "ctf"]);

function EventCard({ event, onDetails }: { event: FestivalEvent; onDetails: () => void }) {
  return (
    <article className={styles.eventCard}>
      <div>
        <div className={styles.eventCardTop}><div className={styles.eventIcon}><Icon name={event.icon} /></div><span className={`${styles.eventDate} ${event.overlap ? styles.overlapDate : ""}`}>Day {event.day} • {event.overlap ? `Overlap Slot ${event.overlap}` : `Oct ${event.date}`}</span></div>
        <h3>{event.title}</h3><p className={styles.eventDescription}>{event.description}</p>
        <dl className={styles.eventDetails}>
          <div><dt>Slot:</dt><dd className={styles.eventTime}>{event.slot}</dd></div>
          <div><dt>Structure:</dt><dd className={event.members > 1 ? styles.teamMode : styles.individualMode}>{event.mode}</dd></div>
          <div><dt>Venue:</dt><dd>{event.venue}</dd></div>
        </dl>
      </div>
      <div className={styles.eventCardBottom}><p className={styles.eventCardFee}>{currency(event.fee)}{event.feeUnit && <span>/{event.feeUnit}</span>}</p><div><button className={styles.detailsButton} type="button" onClick={onDetails}>Details<span className="sr-only"> for {event.title}</span></button><SelectEventButton className={styles.cardSelect} id={event.id}>Select<span className="sr-only"> {event.title}</span></SelectEventButton></div></div>
    </article>
  );
}

export function EventsCatalog() {
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<FestivalEvent>(events[0]);
  const dialog = useRef<HTMLDialogElement>(null);
  const displayedEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "day1") return event.day === 1;
    if (filter === "day2") return event.day === 2;
    if (filter === "solo") return event.members === 1;
    if (filter === "team") return event.members > 1;
    if (filter === "esports") return esportsEvents.has(event.id);
    return technicalEvents.has(event.id);
  });

  function openDetails(event: FestivalEvent) {
    setDetail(event);
    dialog.current?.showModal();
  }

  return (
    <section id="events" className={`${styles.container} ${styles.cyberSection}`} aria-labelledby="events-title">
      <div className={styles.catalogHeading}>
        <div><span className={styles.eyebrow}>Battle Matrix &amp; Tracks</span><h2 className={styles.cyberHeading} id="events-title">10 Competition Signals</h2><p className={styles.catalogDescription}>Review each sanctioned track, timing, venue, and participation mode before selecting a registration slot.</p></div>
        <div className={styles.tabs} role="group" aria-label="Filter competitions">{filters.map((item) => <button className={filter === item.id ? styles.activeTab : ""} key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} type="button">{item.label}</button>)}</div>
      </div>
      <div className={styles.eventsGrid}>{displayedEvents.map((event) => <EventCard key={event.id} event={event} onDetails={() => openDetails(event)} />)}</div>
      <dialog ref={dialog} className={styles.eventModal} aria-labelledby="event-dialog-title" onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <button className={styles.modalClose} type="button" onClick={() => dialog.current?.close()} aria-label="Close event details"><Icon name="close" /></button>
        <div className={styles.eventIcon}><Icon name={detail.icon} /></div>
        <p className={styles.eyebrow}>Day {detail.day} • {detail.date} October 2026</p>
        <h2 className={styles.cyberHeading} id="event-dialog-title">{detail.title}</h2><p>{detail.description}</p>
        <dl className={styles.eventDetails}><div><dt>Time slot</dt><dd>{detail.slot}</dd></div><div><dt>Participation</dt><dd>{detail.mode}</dd></div><div><dt>Venue</dt><dd>{detail.venue}</dd></div><div><dt>Registration fee</dt><dd>{currency(detail.fee)}{detail.feeUnit && `/${detail.feeUnit}`}</dd></div></dl>
        <p className={styles.modalNote}>Check the master schedule before choosing your events. Overlapping time slots cannot be registered together.</p>
        <div onClick={() => dialog.current?.close()}><SelectEventButton className={`${styles.button} ${styles.primaryButton}`} id={detail.id}>Select for Registration <Icon name="arrow_forward" /></SelectEventButton></div>
      </dialog>
    </section>
  );
}
