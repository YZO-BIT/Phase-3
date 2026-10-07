"use client";

import { useCallback, useEffect, useState } from "react";
import { events, getConflictingEvent } from "@/lib/events";
import { frontendEventById } from "@/lib/frontend-events";
import { SELECT_EVENT } from "@/lib/registration";

export function useEventSelection(initialIds: string[], onQuickSelect?: () => void) {
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [conflict, setConflict] = useState("");

  const select = useCallback((id: string, toggle = true) => {
    const candidate = events.find((event) => event.id === id);
    if (!candidate) return;
    if (selectedIds.includes(id)) {
      if (toggle) setSelectedIds(selectedIds.filter((selected) => selected !== id));
      setConflict("");
      return;
    }
    const overlap = getConflictingEvent(candidate, selectedIds);
    if (overlap) {
      setConflict(`${candidate.title} (${candidate.date} Oct, ${candidate.slot}) overlaps with ${overlap.title} (${overlap.slot}). Uncheck the selected event to choose this slot.`);
      return;
    }
    setSelectedIds([...selectedIds, id]);
    setConflict("");
  }, [selectedIds]);

  useEffect(() => {
    function handleQuickSelect(event: Event) {
      select((event as CustomEvent<string>).detail, false);
      onQuickSelect?.();
    }
    window.addEventListener(SELECT_EVENT, handleQuickSelect);
    return () => window.removeEventListener(SELECT_EVENT, handleQuickSelect);
  }, [select, onQuickSelect]);

  const selectedEvents = events.filter((event) => selectedIds.includes(event.id));
  const total = selectedEvents.reduce((sum, event) => sum + event.fee, 0);
  const displayTotal = selectedEvents.reduce((sum, event) => sum + (frontendEventById.get(event.id)?.officialFee ?? event.fee), 0);
  return { selectedIds, selectedEvents, total, displayTotal, conflict, select, dismissConflict: () => setConflict("") };
}
