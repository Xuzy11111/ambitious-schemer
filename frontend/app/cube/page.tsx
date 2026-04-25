import { Suspense } from "react";

import DashboardCubeClient from "../DashboardCubeClient";

export default function CubePage() {
  return (
    <Suspense fallback={null}>
      <DashboardCubeClient />
    </Suspense>
  );
}
