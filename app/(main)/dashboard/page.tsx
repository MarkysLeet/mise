import { Suspense } from "react";
import { DashboardClient } from "./DashboardClient";
import DashboardLoading from "./loading";

export const metadata = {
  title: "Kontrol Paneli | Mise",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClient />
    </Suspense>
  );
}
