import { useRef, useEffect, useState } from "react";

/* A Canvas component that can be drawn on with the mouse.
  - width: width of canvas
  - height: height of canvas
  - lineWidth: width of drawing line
  - minDist: minimum length of line strokes in the drawing

*/

export default function DrawCanvas({ width, height, lineWidth, minDist }) {
  const drawCanvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [oldClient, setOldClient] = useState();

  useEffect(function () {
    if (!ctx) {
      setCtx(drawCanvasRef.current.getContext("2d"));
    } else if (!ready) {
      ctx.reset();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000000";
      setReady(true);
    }
  });

  function resetCanvas() {
    setReady(false);
  }

  function handleMouseDown(e) {
    // draws a dot
    ctx.moveTo(oldClient.x, oldClient.y);
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  }

  function handleMouseMove(e) {
    if (e.buttons == 1) {
      // mouse distance since m1 was pressed
      let cur_dist = Math.sqrt(
        Math.pow(e.clientX - oldClient.x, 2) +
          Math.pow(e.clientY - oldClient.y, 2)
      );
      if (cur_dist > minDist) {
        ctx.moveTo(oldClient.x, oldClient.y);
        ctx.lineTo(e.clientX, e.clientY);
        ctx.stroke();
        setOldClient({ x: e.clientX, y: e.clientY });
      }
    } else {
      setOldClient({ x: e.clientX, y: e.clientY });
    }
  }

  return (
    <div>
      <canvas
        width={width}
        height={height}
        ref={drawCanvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
      ></canvas>
      <button onClick={resetCanvas}>Reset</button>
    </div>
  );
}
