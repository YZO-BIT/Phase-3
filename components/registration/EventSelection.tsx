import { currency, getConflictingEvent, type PortalVariant } from "@/lib/events";
import { frontendCurrency, frontendEditorialEvents, frontendEvents, preEventReporting, type FrontendEvent } from "@/lib/frontend-events";
import { Icon } from "../Icon";
import styles from "./Registration.module.css";

export function ConflictNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return <div className={styles.conflictNotice} role="alert"><Icon name="warning" /><div><strong>Schedule Conflict Detected</strong><p>{message}</p></div><button type="button" aria-label="Dismiss conflict message" onClick={onDismiss}><Icon name="close" /></button></div>;
}

export function EventSelection({ variant, selectedIds, onSelect }: { variant: PortalVariant; selectedIds: string[]; onSelect: (id: string) => void }) {
  const cyber = variant === "cyber";
  const items = cyber ? frontendEvents : frontendEditorialEvents;
  return <fieldset className={cyber ? styles.selectionGrid : styles.eventChecklist}>
    <legend className="sr-only">Choose events for registration</legend>
    {items.map((event, index) => {
      const selected = selectedIds.includes(event.id);
      const overlap = getConflictingEvent(event, selectedIds);
      const blocked = Boolean(overlap && !selected);
      const official = cyber ? event as FrontendEvent : null;
      const eventDate = official?.officialDate ?? `${event.date} Oct`;
      const eventTime = official?.officialTime ?? event.slot;
      const eventMode = official?.officialMode ?? event.mode;
      const eventVenue = official?.officialVenue ?? event.venue;
      const eventFee = event.fee;
      return <label className={`${cyber ? styles.selectionCard : styles.checklistItem} ${selected ? styles.selectedCard : ""} ${blocked ? styles.blockedCard : ""}`} key={event.id}>
        {cyber ? <>
        <div className={styles.selectionCardMeta}><span>{eventDate} • {eventTime}</span><input type="checkbox" checked={selected} disabled={blocked} aria-describedby={blocked ? `blocked-${event.id}` : undefined} onChange={() => onSelect(event.id)} /></div>
        <h3>{event.title}</h3><p>{eventMode} • {eventVenue}</p>{official?.officialDay === 1 && <p className={styles.selectionReporting}>Pre-event reporting: All participants and teams must report to {preEventReporting} before their respective event.</p>}<div className={styles.selectionCardFooter}><strong>{official ? frontendCurrency(eventFee) : currency(eventFee)}{!official && event.feeUnit && <span>/{event.feeUnit}</span>}</strong>{overlap && !selected && <span id={`blocked-${event.id}`}><Icon name="lock_clock" />Disabled · Overlaps with {overlap.title}. Only one can be selected.</span>}</div>
      </> : <><div><input type="checkbox" checked={selected} disabled={blocked} aria-describedby={blocked ? `blocked-${event.id}` : undefined} onChange={() => onSelect(event.id)} /><span>{String(index + 1).padStart(2, "0")}. {event.title}{blocked && <small id={`blocked-${event.id}`}>Overlaps with {overlap!.title}. Only one can be selected.</small>}</span></div><span>{currency(event.fee)}</span></>}
      </label>;
    })}
  </fieldset>;
}
