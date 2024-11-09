import { useRef, useEffect, useState } from "react";
import VipCanvas from "../VipCanvas/VipCanvas";

/* Holds the canvas and video elements for the game.
  - streamRef: will be set to a reference to the canvas's stream
  - width: width of canvas/video
  - height: height of canvas/video
*/

export default function VipHolder({ streamRef, remoteVideoRef }) {
  const canvasRef = useRef(null);

  useEffect(function () {
    streamRef.current = canvasRef.current.captureStream(60);
  }, []);

  return (
    <>
      <VipCanvas
        canvasRef={canvasRef}
        width={300}
        height={300}
        lineWidth={5}
        minDist={1}
      />
      <video className="bg-white h-[300px] w-[300px]" ref={remoteVideoRef} />
    </>
  );
}
