import { Suspense } from "react";
import { SeoLinks } from "./seo/components";
import ParkingPrixApp from "./ui/ParkingPrixApp";

export default function Home() {
  return (
    <Suspense>
      <ParkingPrixApp />
      <div className="shell seo-home-links">
        <SeoLinks />
      </div>
    </Suspense>
  );
}
