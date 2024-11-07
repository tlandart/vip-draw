"use client";

import DrawCanvas from "../components/DrawCanvas/DrawCanvas";

export default function Home() {
  return <DrawCanvas width={500} height={500} lineWidth={5} minDist={1} />;
}
