import { useRef, useEffect, useState } from "react";
import VipCanvas from "../VipCanvas/VipCanvas";

/*
  Holds the canvas and video elements for the game.
    - streamRef: will be set to a reference to the canvas's stream
    - remoteVideoRef: will be set to a reference to the video stream
    - idLabelRef: will be set to a reference to the id label
    - setCanvasResetFunc: set a function that resets/saves the canvas
    - showCanvas, showVideo: show corresponding elements
*/

export default function VipHolder({
  streamRef,
  remoteVideoRef,
  idLabelRef,
  setCanvasResetFunc,
  showCanvas,
  showVideo,
}) {
  const canvasRef = useRef(null);

  useEffect(function () {
    streamRef.current = canvasRef.current.captureStream(60);
  }, []);

  return (
    <>
      <span ref={idLabelRef}></span>
      <VipCanvas
        className={`m-2 ${showCanvas ? "" : "hidden"}`}
        canvasRef={canvasRef}
        setCanvasResetFunc={setCanvasResetFunc}
        width={300}
        height={300}
        lineWidth={5}
        minDist={1}
      />
      <video
        className={`bg-white h-[300px] w-[300px] m-2 ${
          showVideo ? "" : "hidden"
        }`}
        ref={remoteVideoRef}
      />
      {showCanvas && <span className="block text-xl">Draw!</span>}
      {showVideo && <span className="block text-xl">Guess!</span>}
    </>
  );
}
