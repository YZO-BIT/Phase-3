import { competitionDates, closingCeremony, frontendEvents, officialFinalists, openingCeremony, type FrontendEvent } from "@/lib/frontend-events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

function sessionFor(event: FrontendEvent, date: 16 | 17 | 19) {
  return event.sessions.find((session) => session.date === date);
}

function sessionsFor(date: 16 | 17 | 19) {
  return frontendEvents
    .flatMap((event) => {
      const session = sessionFor(event, date);
      return session ? [{ event, session }] : [];
    })
    .sort((first, second) => first.session.start - second.session.start);
}

export function EditorialSchedule() {
  return <section id="schedule" className={`${styles.section} ${styles.alternateSection}`} aria-labelledby="schedule-title">
    <div className={styles.container}>
      <div className={styles.editorialScheduleHeading}>
        <div><span className={styles.eyebrow}>Temporal Log · IST (Asia/Kolkata)</span><h2 id="schedule-title" className={styles.largeHeading}>Master Schedule &amp; Overlap Map</h2></div>
        <p className={styles.conflictWatch}><span className={styles.square} />Active Conflict Watch Active</p>
      </div>
      <div className={styles.editorialScheduleGrid}>{competitionDates.map((date, index) => {
        const scheduled = sessionsFor(date);
        return <article className={styles.scheduleDay} key={date}>
          <div className={styles.scheduleDayHeading}><div><span className={styles.eyebrow}>Day 0{index + 1}</span><h3>{date} October 2026</h3></div><span>{date === 19 ? "Finals & Closing Ceremony" : `${scheduled.length + (date === 16 ? 1 : 0)} Sessions`}</span></div>
          <div className={styles.scheduleBlocks}>
            <div className={`${styles.scheduleBlock} ${styles.conflictBlock}`}>
              <div className={styles.scheduleBlockLabel}><span>{date === 19 ? "Final Round & Closing Ceremony" : date === 16 ? "Opening, Qualifying & Trivia" : "Technical & Gaming Competitions"}</span><span>{date === 19 ? "Official" : "Lock Enabled"}</span></div>
              <div className={styles.schedulePair}>
                {date === 16 && <div><h4>{openingCeremony.label}</h4><p>{openingCeremony.time} • Opening Ceremony of Phase 3</p></div>}
                {date === 19 ? <>{officialFinalists.map((event) => <div key={event.id}><h4>{event.title}</h4><p>9:00 AM – 11:30 AM • Final Round • {event.officialVenue}</p></div>)}<div><h4>{closingCeremony.label}</h4><p>{closingCeremony.time} • {closingCeremony.details}</p></div></> : scheduled.map(({ event, session }) => <div key={`${date}-${event.id}`}><h4>{event.title}</h4><p>{session.slot} • {event.editorialVenue}</p></div>)}
              </div>
              <div className={styles.scheduleExplanation}><Icon name="info" /><p>Overlapping contests cannot be entered together. Check each event&apos;s full time slot.</p></div>
            </div>
          </div>
        </article>;
      })}</div>
    </div>
  </section>;
}
