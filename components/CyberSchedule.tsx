"use client";

import { useState } from "react";
import { events, type FestivalEvent } from "@/lib/events";
import { Icon } from "./Icon";
import styles from "./Portal.module.css";

function Track({ title, window, items, violet = false }: { title: string; window: string; items: FestivalEvent[]; violet?: boolean }) {
  return <article className={styles.cyberTrack}>
    <div className={styles.trackHeading}><h3 className={violet ? styles.violetText : ""}>{title}</h3><span>{window}</span></div>
    <div className={styles.trackItems}>{items.map((event) => <div className={styles.trackEvent} key={event.id}><div><h4>{event.title}</h4><p>{event.slot} • {event.venue}</p></div><span className={`${styles.trackMode} ${event.members > 1 ? styles.squadBadge : ""}`}>{event.members === 1 ? "Indiv" : event.id === "ctf" ? "Squad 2–3" : event.id === "hunt" ? "Squad 3–4" : `Squad ${event.members}`}</span></div>)}</div>
  </article>;
}

export function CyberSchedule() {
  const [day, setDay] = useState(1);
  return (
    <section id="schedule" className={`${styles.container} ${styles.cyberSection}`} aria-labelledby="schedule-title">
      <div className={styles.scheduleMatrix}>
        <div className={styles.matrixHeading}><div><span className={styles.eyebrow}>Operational Timetable</span><h2 id="schedule-title" className={styles.cyberHeading}>Master Schedule &amp; Conflict Mapping</h2></div><div className={styles.tabs} role="group" aria-label="Schedule dates"><button type="button" className={day === 1 ? styles.activeTab : ""} aria-pressed={day === 1} onClick={() => setDay(1)}>16 October (Day 1)</button><button type="button" className={day === 2 ? styles.activeTab : ""} aria-pressed={day === 2} onClick={() => setDay(2)}>17 October (Day 2)</button></div></div>
        <div className={styles.slotWarning}><Icon name="warning" /><p><strong>Slot Warning:</strong> {day === 1 ? "BGMI, Free Fire MAX, Valorant, and Clash Royale have overlapping slots on 16 October. Smash Karts starts at 4:00 PM." : "CTF overlaps with Competitive Programming and the afternoon competitions. Chess, Campus Treasure Hunt, and Turbo Trivia also overlap on 17 October."}</p></div>
        <div className={styles.cyberTrackGrid}>
          {day === 1 ? <><Track title="16 October • Esports & Combat" window="Morning Window" items={events.filter((event) => ["val", "bgmi", "ff"].includes(event.id))} /><Track title="16 October • Arena Tracks" window="Day 1" items={events.filter((event) => ["royale", "karts"].includes(event.id))} violet /></> : <><Track title="Track Alpha • CSE Sector" window="Morning Window" items={events.slice(0, 2)} /><Track title="Track Beta • Strategic Grounds" window="Afternoon Window" items={events.filter((event) => ["chess", "hunt", "trivia"].includes(event.id))} violet /></>}
        </div>
      </div>
    </section>
  );
}
