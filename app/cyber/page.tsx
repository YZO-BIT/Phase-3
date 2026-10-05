import type { Metadata } from "next";
import { Portal } from "@/components/Portal";

export const metadata: Metadata = {
  title: "technIEEEks’26 — Phase 3 | Cyber Registration Portal",
};

export default function CyberPage() {
  return <Portal variant="cyber" />;
}
