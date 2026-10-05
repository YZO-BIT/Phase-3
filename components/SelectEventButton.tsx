"use client";

import { selectEvent } from "@/lib/registration";

export function SelectEventButton({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  return <a className={className} href="#register" onClick={() => selectEvent(id)}>{children}</a>;
}
