import { events } from "@/lib/events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

export function EditorialSchedule() {
  return <section id="schedule" className={`${styles.section} ${styles.alternateSection}`} aria-labelledby="schedule-title">
    <div className={styles.container}>
      <div className={styles.editorialScheduleHeading}>
        <div><span className={styles.eyebrow}>Temporal Log</span><h2 id="schedule-title" className={styles.largeHeading}>Master Schedule &amp; Overlap Map</h2></div>
        <p className={styles.conflictWatch}><span className={styles.square} />Active Conflict Watch Active</p>
      </div>
      <div className={styles.editorialScheduleGrid}>{([16, 17] as const).map((date, index) => <article className={styles.scheduleDay} key={date}>
        <div className={styles.scheduleDayHeading}><div><span className={styles.eyebrow}>Day 0{index + 1}</span><h3>{date} October 2026</h3></div><span>5 Sessions</span></div>
        <div className={styles.scheduleBlocks}>
          <div className={`${styles.scheduleBlock} ${styles.conflictBlock}`}>
            <div className={styles.scheduleBlockLabel}><span>{date === 16 ? "Esports & Combat" : "Technical & Strategy"}</span><span>Lock Enabled</span></div>
            <div className={styles.schedulePair}>{events.filter((event) => event.date === date).sort((a, b) => a.start - b.start).map((event) => <div key={event.id}><h4>{event.title}</h4><p>{event.time} • {event.editorialVenue}</p></div>)}</div>
            <div className={styles.scheduleExplanation}><Icon name="info" /><p>Overlapping contests cannot be entered together. Check each event&apos;s full time slot.</p></div>
          </div>
        </div>
      </article>)}</div>
    </div>
  </section>;
}
