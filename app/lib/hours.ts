/**
 * Lecture prudente des horaires publiés en texte libre (« 24h / 24 », « 07h / 23h »,
 * « 5h / 1h30 »). Tout texte plus complexe (jours, exceptions) reste affiché
 * tel quel, sans statut « ouvert » ou « fermé » : on ne devine pas.
 */
export type OpenState = "open" | "closed" | undefined;

export function parseOpenNow(hours: string | undefined, minutesNow: number): OpenState {
  if (!hours) return undefined;
  const text = hours.toLowerCase();
  if (/24\s*h?\s*(\/|sur)\s*24/.test(text)) return "open";
  if (/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|dim|jrs|f[eé]ri|sauf|ferm[eé]|abonn)/.test(text)) return undefined;
  const match = text.match(/^\s*(\d{1,2})\s*h\s*(\d{2})?\s*(?:\/|-|à|a)\s*(\d{1,2})\s*h\s*(\d{2})?\s*$/);
  if (!match) return undefined;
  const open = Number(match[1]) * 60 + Number(match[2] ?? 0);
  const close = Number(match[3]) * 60 + Number(match[4] ?? 0);
  if (open === close) return "open";
  const inside = open < close ? minutesNow >= open && minutesNow < close : minutesNow >= open || minutesNow < close;
  return inside ? "open" : "closed";
}

export function parisMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
