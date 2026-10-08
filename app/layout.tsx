import type { Metadata } from "next";
import "./globals.css";

const description =
  "Comparez les tarifs publics réels des parkings ouverts à tous autour de votre destination : prix pour 15 min, 1 h, 2 h ou la journée, et distance à pied.";

export const metadata: Metadata = {
  metadataBase: new URL("https://parkingprix.com"),
  title: {
    default: "Prix des parkings autour de votre destination | ParkingPrix",
    template: "%s | ParkingPrix",
  },
  description,
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "Où se garer au meilleur prix | ParkingPrix",
    description,
    url: "https://parkingprix.com",
    siteName: "ParkingPrix",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
