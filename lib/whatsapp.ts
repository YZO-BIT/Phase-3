export const WHATSAPP_COMMUNITY_URL_ENV = "NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL";
export const DEFAULT_WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/Kd4hu9LIUdm811J2EWKUX2";

export function normalizeWhatsAppCommunityUrl(raw: string | undefined) {
  const value = raw?.trim() || "";
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "chat.whatsapp.com" || url.port || url.username || url.password || url.search || url.hash) return null;
    if (!/^\/[A-Za-z0-9_-]+$/.test(url.pathname)) return null;
    return `https://chat.whatsapp.com${url.pathname}`;
  } catch {
    return null;
  }
}

export function getWhatsAppCommunityInviteUrl(raw?: string) {
  const configured = raw === undefined ? process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL : raw;
  if (!configured?.trim()) return DEFAULT_WHATSAPP_COMMUNITY_URL;
  return normalizeWhatsAppCommunityUrl(configured);
}
