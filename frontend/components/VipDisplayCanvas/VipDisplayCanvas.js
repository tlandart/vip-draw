import { useRef, useEffect, useState } from "react";

/* A Canvas component that can display a drawing given an input.
 */

export default function VipDisplayCanvas({ width, height, drawing }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const timeouts = useRef([]);

  useEffect(function () {
    ctxRef.current = canvasRef.current.getContext("2d");
  });

  useEffect(
    function () {
      resetCanvas();
      drawDrawing(drawing);
    },
    [drawing]
  );

  function resetCanvas() {
    for (let t of timeouts.current) {
      clearTimeout(t);
    }
    ctxRef.current.reset();
    ctxRef.current.fillStyle = "#ffffff"; // bg colour
    ctxRef.current.fillRect(0, 0, width, height);
    ctxRef.current.lineCap = "round";
  }

  function drawLineSegment(x1, y1, x2, y2, lineColour) {
    ctxRef.current.strokeStyle = lineColour;
    ctxRef.current.beginPath(); // <- important to reduce lag
    ctxRef.current.moveTo(x1, y1);
    ctxRef.current.lineTo(x2, y2);
    ctxRef.current.stroke();
    ctxRef.current.closePath(); // <- important to reduce lag
  }

  // draw a full drawing (an array of lines)
  function drawDrawing(lines) {
    let pointCount = 1;
    for (const line of lines) {
      if (line.points.length === 1) {
        drawLineSegment(
          line.points[0].x,
          line.points[0].y,
          line.points[0].x,
          line.points[0].y,
          line.colour
        );
      } else if (line.points.length > 1) {
        let lastPoint = line.points[0];
        for (const point of line.points.slice(1)) {
          pointCount++;
          timeouts.current.push(
            setTimeout(function () {
              drawLineSegment(
                lastPoint.x,
                lastPoint.y,
                point.x,
                point.y,
                line.colour
              );
              lastPoint = point;
            }, Math.floor(pointCount / 2))
          );
        }
      }
    }
  }

  return (
    <div className="border-2 border-amber-500">
      <canvas
        className={`bg-white h-52 w-52`}
        width={300}
        height={300}
        style={{ width: "100%", height: "100%" }}
        ref={canvasRef}
      ></canvas>
    </div>
  );
}
