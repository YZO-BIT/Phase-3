import { currency } from "@/lib/events";
import { frontendEditorialEvents } from "@/lib/frontend-events";
import { SelectEventButton } from "./SelectEventButton";
import styles from "./Portal.module.css";

export function EventsList() {
  return (
    <section id="events" className={styles.section} aria-labelledby="events-title">
      <div className={styles.container}>
        <div className={styles.eventsListHeading}>
          <div><span className={styles.eyebrow}>Sanctioned Brackets • 16–17 Oct 2026</span><h2 id="events-title" className={styles.largeHeading}>Events / 10</h2></div>
          <p>Select bracket slots for registration integration. Slot quotas strictly capped per room capacity.</p>
        </div>
        <div className={styles.eventsList}>{frontendEditorialEvents.map((event, index) => (
          <article className={styles.eventRow} key={event.id}>
            <span className={styles.eventNumber}>{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.eventRowTitle}><div><h3>{event.title}</h3>{event.id === "ctf" && <span className={styles.criticalBadge}>Critical</span>}</div><p>{event.editorialDescription}</p></div>
            <div className={styles.eventRowMeta}><strong>{event.date} Oct • {event.time}</strong><span>{event.editorialVenue} • {event.members === 1 ? "INDIVIDUAL" : `${event.id === "val" ? "TEAM" : "SQUAD"} (${event.id === "ctf" ? "2-3" : event.id === "hunt" ? "3-4" : event.members})`}</span></div>
            <span className={styles.eventRowFee}>{currency(event.fee)}</span>
            <SelectEventButton id={event.id} className={styles.selectSlot}>Select Slot<span className="sr-only"> for {event.title}</span></SelectEventButton>
          </article>
        ))}</div>
      </div>
    </section>
  );
}
