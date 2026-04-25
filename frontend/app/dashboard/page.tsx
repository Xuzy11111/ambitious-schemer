import { Suspense } from "react";

import DashboardCubeClient from "../DashboardCubeClient";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardCubeClient />
    </Suspense>
  );
}
