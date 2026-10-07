import { currency, events, editorialEvents, getConflictingEvent, type PortalVariant } from "@/lib/events";
import { Icon } from "../Icon";
import styles from "./Registration.module.css";

export function ConflictNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return <div className={styles.conflictNotice} role="alert"><Icon name="warning" /><div><strong>Schedule Conflict Detected</strong><p>{message}</p></div><button type="button" aria-label="Dismiss conflict message" onClick={onDismiss}><Icon name="close" /></button></div>;
}

export function EventSelection({ variant, selectedIds, onSelect }: { variant: PortalVariant; selectedIds: string[]; onSelect: (id: string) => void }) {
  const cyber = variant === "cyber";
  const items = cyber ? events : editorialEvents;
  return <fieldset className={cyber ? styles.selectionGrid : styles.eventChecklist}>
    <legend className="sr-only">Choose events for registration</legend>
    {items.map((event, index) => {
      const selected = selectedIds.includes(event.id);
      const overlap = getConflictingEvent(event, selectedIds);
      const blocked = Boolean(overlap && !selected);
      return <label className={`${cyber ? styles.selectionCard : styles.checklistItem} ${selected ? styles.selectedCard : ""} ${blocked ? styles.blockedCard : ""}`} key={event.id}>
        {cyber ? <>
        <div className={styles.selectionCardMeta}><span>{event.date} Oct • {event.slot}</span><input type="checkbox" checked={selected} disabled={blocked} aria-describedby={blocked ? `blocked-${event.id}` : undefined} onChange={() => onSelect(event.id)} /></div>
        <h3>{event.title}</h3><p>{event.mode} • {event.venue}</p><div className={styles.selectionCardFooter}><strong>{currency(event.fee)}{event.feeUnit && <span>/{event.feeUnit}</span>}</strong>{overlap && !selected && <span id={`blocked-${event.id}`}><Icon name="lock_clock" />Disabled · Clashes with {overlap.title}</span>}</div>
      </> : <><div><input type="checkbox" checked={selected} disabled={blocked} aria-describedby={blocked ? `blocked-${event.id}` : undefined} onChange={() => onSelect(event.id)} /><span>{String(index + 1).padStart(2, "0")}. {event.title}</span></div><span>{currency(event.fee)}</span></>}
      </label>;
    })}
  </fieldset>;
}
