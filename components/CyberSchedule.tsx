"use client";

import { useState } from "react";
import { frontendEvents, officialFinalists, preEventReporting, type FrontendEvent } from "@/lib/frontend-events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

type ScheduleDay = 1 | 2 | 19;

function Track({ title, window, items, emptyLabel, finalRound = false, violet = false }: { title: string; window: string; items: FrontendEvent[]; emptyLabel?: string; finalRound?: boolean; violet?: boolean }) {
  return <article className={styles.cyberTrack}>
    <div className={styles.trackHeading}><h3 className={violet ? styles.violetText : ""}>{title}</h3><span>{window}</span></div>
    <div className={styles.trackItems}>{items.map((event) => <div className={styles.trackEvent} key={event.id}><div><h4>{event.title}</h4><p>{finalRound ? "9:00 AM · Final Round" : event.officialTime} • {event.officialVenue}</p></div><span className={`${styles.trackMode} ${event.officialMode.startsWith("Individual") ? "" : styles.squadBadge}`}>{event.officialMode}</span></div>)}{emptyLabel && <div className={styles.trackEvent}><div><h4>{emptyLabel}</h4><p>{window}</p></div></div>}</div>
  </article>;
}

const esports = frontendEvents.filter((event) => event.isEsports);
const technical = frontendEvents.filter((event) => ["cp", "ctf", "chess", "hunt"].includes(event.id));
const trivia = frontendEvents.filter((event) => event.id === "trivia");

export function CyberSchedule() {
  const [day, setDay] = useState<ScheduleDay>(1);
  const scheduleCopy = day === 1
    ? "16 October contains both esports qualifying rounds. Turbo Trivia begins at 1:00 PM between the qualifying windows."
    : day === 2
      ? "17 October opens with the ceremony, then CP and CTF begin together at 10:00 AM before Chess and Treasure Hunt."
      : "19 October is the final round for all esports games, followed by closing ceremony and award distribution at 12:30 PM.";

  return (
    <section id="schedule" className={`${styles.container} ${styles.cyberSection}`} aria-labelledby="schedule-title">
      <div className={styles.scheduleMatrix}>
        <div className={styles.matrixHeading}><div><span className={styles.eyebrow}>Official Operational Timetable</span><h2 id="schedule-title" className={styles.cyberHeading}>Master Schedule &amp; Conflict Mapping</h2></div><div className={styles.tabs} role="group" aria-label="Schedule dates"><button type="button" className={day === 1 ? styles.activeTab : ""} aria-pressed={day === 1} onClick={() => setDay(1)}>16 October · Qualifying</button><button type="button" className={day === 2 ? styles.activeTab : ""} aria-pressed={day === 2} onClick={() => setDay(2)}>17 October · Technical</button><button type="button" className={day === 19 ? styles.activeTab : ""} aria-pressed={day === 19} onClick={() => setDay(19)}>19 October · Finals</button></div></div>
        <div className={styles.slotWarning}><Icon name="warning" /><p><strong>Official itinerary:</strong> {scheduleCopy}</p></div>
        <div className={`${styles.reportingNotice} ${styles.scheduleReporting}`}><Icon name="location_on" /><p><strong>Pre-event reporting:</strong> All participants and teams must report to {preEventReporting} before their respective event.</p></div>
        <div className={styles.cyberTrackGrid}>
          {day === 1 ? <><Track title="16 October • Esports Qualifying Round 1" window="9:00 AM" items={esports} /><Track title="16 October • Turbo Trivia" window="1:00 PM" items={trivia} violet /><Track title="16 October • Esports Qualifying Round 2" window="2:00 PM" items={esports} violet /></> : day === 2 ? <><Track title="17 October • Opening Ceremony" window="9:00 AM" items={[]} emptyLabel="Opening Ceremony" /><Track title="17 October • Technical / Other Competitions" window="10:00 AM–12:00 PM" items={technical} violet /></> : <><Track title="19 October • Esports Final Round" window="9:00 AM" items={officialFinalists} finalRound /><Track title="19 October • Closing Ceremony + Award Distribution" window="12:30 PM" items={[]} emptyLabel="Closing Ceremony + Award Distribution" violet /></>}
        </div>
      </div>
    </section>
  );
}
