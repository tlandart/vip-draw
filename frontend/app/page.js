"use client";

import DCanvas from "../components/DrawCanvas/DCanvas";

export default function Home() {
  return <DCanvas width={500} height={500} lineWidth={5} minDist={3} />;
}
