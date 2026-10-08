/**
 * Liens d’itinéraire vers les applications de navigation. Sans point de départ,
 * chacune démarre depuis la position de l’appareil (géolocalisation gérée par
 * l’application de navigation elle-même, pas par ParkingPrix).
 */
export type NavTarget = { lat: number; lon: number; name?: string };

export function navigationLinks({ lat, lon }: NavTarget) {
  const to = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return [
    { id: "google", label: "Google Maps", href: `https://www.google.com/maps/dir/?api=1&destination=${to}&travelmode=driving` },
    { id: "apple", label: "Plans (Apple)", href: `https://maps.apple.com/?daddr=${to}&dirflg=d` },
    { id: "waze", label: "Waze", href: `https://waze.com/ul?ll=${to}&navigate=yes` },
  ] as const;
}
