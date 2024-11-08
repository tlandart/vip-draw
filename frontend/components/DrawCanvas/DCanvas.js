import { useRef, useEffect, useState } from "react";

/* A Canvas component that can be drawn on with the mouse.
  - width: width of canvas
  - height: height of canvas
  - lineWidth: width of drawing line
  - minDist: minimum length of line strokes in the drawing

*/

export default function DCanvas({ width, height, lineWidth, minDist }) {
  const dCanvasRef = useRef(null);
  const [resetting, setResetting] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [oldMouse, setOldMouse] = useState();

  const [isDrawing, setIsDrawing] = useState(false);

  // a line is an array of points (x,y)
  const [currentLine, setCurrentLine] = useState([]);

  // array of all lines (will be replaced with DB)
  const [currentDrawing, setCurrentDrawing] = useState([]);

  useEffect(function () {
    if (!ctx) {
      setCtx(dCanvasRef.current.getContext("2d"));
    } else if (!resetting) {
      resetCanvas(false);
      drawDrawing(currentDrawing);
    }
  });

  function resetCanvas(deleteDrawing = false) {
    if (deleteDrawing) {
      setCurrentLine([]);
      setCurrentDrawing([]);
    }
    ctx.reset();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000000";
    setResetting(true);
  }

  function drawLineSegment(x1, y1, x2, y2) {
    ctx.beginPath(); // <- important to reduce lag
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath(); // <- important to reduce lag
  }

  function startCurrentLine(e) {
    if (!isDrawing && e.buttons == 1) {
      setCurrentLine([{ x: e.clientX, y: e.clientY }]);
      drawLineSegment(e.clientX, e.clientY, e.clientX, e.clientY);
      setIsDrawing(true);
    }
  }

  // add point to current line
  function addCurrentLine(e) {
    if (isDrawing) {
      // mouse distance since m1 was pressed down
      let cur_dist = Math.sqrt(
        Math.pow(e.clientX - oldMouse.x, 2) +
          Math.pow(e.clientY - oldMouse.y, 2)
      );
      if (cur_dist > minDist) {
        setCurrentLine([...currentLine, { x: e.clientX, y: e.clientY }]);
        drawLineSegment(oldMouse.x, oldMouse.y, e.clientX, e.clientY);
        setOldMouse({ x: e.clientX, y: e.clientY });
      }
    } else {
      setOldMouse({ x: e.clientX, y: e.clientY });
    }
  }

  function endCurrentLine() {
    if (isDrawing) {
      setIsDrawing(false);
      setCurrentDrawing([...currentDrawing, currentLine]);
    }
  }

  // draw a full drawing (an array of lines)
  function drawDrawing(lines) {
    for (const line of lines) {
      if (line.length === 1) {
        drawLineSegment(line[0].x, line[0].y, line[0].x, line[0].y);
      } else if (line.length > 1) {
        let lastPoint = line[0];
        for (const point of line.slice(1)) {
          drawLineSegment(lastPoint.x, lastPoint.y, point.x, point.y);
          lastPoint = point;
        }
      }
    }
  }

  function undoLastLine() {
    setCurrentDrawing(currentDrawing.slice(0, -1));
    setResetting(false);
  }

  function handleKeyPress(e) {
    console.log(e.keyCode);
    if (e.ctrlKey && e.keyCode === 90) {
      undoLastLine();
    }
  }

  return (
    <div>
      <canvas
        width={width}
        height={height}
        ref={dCanvasRef}
        onMouseMove={(e) => addCurrentLine(e)}
        onMouseDown={(e) => startCurrentLine(e)}
        onMouseEnter={(e) => startCurrentLine(e)}
        onMouseUp={endCurrentLine}
        onMouseLeave={endCurrentLine}
      ></canvas>
      <button onClick={() => resetCanvas(true)}>[Reset]</button>
      <button onClick={undoLastLine}>[Undo]</button>
    </div>
  );
}
