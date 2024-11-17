import { useRef, useEffect, useState } from "react";

/* A Canvas component that can be drawn on with the mouse, with undo and reset buttons.
    - canvasRef: will be set to a reference to the pure html canvas
    - setStream: function to set our outgoing stream of the canvas
    - setCanvasResetFunc: function to set a function that resets/saves the canvas
    - setCanvasResetFunc: function to set a function that refreshes the canvas
    - width/height: width/height of canvas
    - lineWidth: width of drawing line
    - minDist: minimum length of line strokes in the drawing
*/

export default function VipCanvas({
  className,
  setStream,
  setCanvasSaveFunc,
  setCanvasRefreshFunc,
  width,
  height,
  lineWidth,
  minDist,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const oldMouse = useRef();

  const [isDrawing, setIsDrawing] = useState(false);

  // a line is an array of points (x,y)
  const currentLine = useRef([]);

  // array of all lines (will be replaced with DB)
  const currentDrawing = useRef([]);

  useEffect(function () {
    // set the function
    setCanvasSaveFunc(() => () => {
      // TODO save drawing to db
      console.log("saving to db", currentDrawing);
      // don't need to reset canvas because it is re-rendered anyway
      resetCanvas(true);
    });

    setCanvasRefreshFunc(() => () => {
      console.log("refreshing");
      ctxRef.current.drawImage(ctxRef.current.canvas, 0, 0);
    });

    setStream(canvasRef.current.captureStream(60));

    // function createEmptyStream() {
    //   const canvas = Object.assign(document.createElement("canvas"), {});
    //   canvas.getContext("2d").fillRect(0, 0, 20, 20);

    //   const stream = canvas.captureStream();
    //   const track = stream.getVideoTracks()[0];

    //   let emptyVid = Object.assign(track, { enabled: false });
    //   return new MediaStream([emptyVid]);
    // }
    // setStream(createEmptyStream());

    ctxRef.current = canvasRef.current.getContext("2d");
    resetCanvas(true);
  }, []);

  function resetCanvas(deleteStoredDrawing = false) {
    if (deleteStoredDrawing) {
      currentLine.current = [];
      currentDrawing.current = [];
    }
    ctxRef.current.reset();
    ctxRef.current.fillStyle = "#ffffff";
    ctxRef.current.fillRect(0, 0, width, height);
    ctxRef.current.lineWidth = lineWidth;
    ctxRef.current.lineCap = "round";
    ctxRef.current.strokeStyle = "#000000";
  }

  function drawLineSegment(x1, y1, x2, y2) {
    ctxRef.current.beginPath(); // <- important to reduce lag
    ctxRef.current.moveTo(x1, y1);
    ctxRef.current.lineTo(x2, y2);
    ctxRef.current.stroke();
    ctxRef.current.closePath(); // <- important to reduce lag
  }

  function getMousePosition(e) {
    // https://stackoverflow.com/a/42111623
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left; //x position within the element.
    var y = e.clientY - rect.top; //y position within the element.
    return { x: x, y: y };
  }

  function startCurrentLine(e) {
    if (!isDrawing && e.buttons == 1) {
      var p = getMousePosition(e);
      currentLine.current = [p];
      drawLineSegment(p.x, p.y, p.x, p.y);
      setIsDrawing(true);
    }
  }

  // add point to current line
  function addCurrentLine(e) {
    var p = getMousePosition(e);
    if (isDrawing) {
      // mouse distance since m1 was pressed down
      var cur_dist = Math.sqrt(
        Math.pow(p.x - oldMouse.current.x, 2) +
          Math.pow(p.y - oldMouse.current.y, 2)
      );
      if (cur_dist > minDist) {
        currentLine.current.push({ x: p.x, y: p.y });
        drawLineSegment(oldMouse.current.x, oldMouse.current.y, p.x, p.y);
        oldMouse.current = { x: p.x, y: p.y };
      }
    } else {
      oldMouse.current = { x: p.x, y: p.y };
    }
  }

  function endCurrentLine() {
    if (isDrawing) {
      setIsDrawing(false);
      currentDrawing.current.push(currentLine.current);
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
    currentDrawing.current = currentDrawing.current.slice(0, -1);
    resetCanvas(false);
    drawDrawing(currentDrawing.current);
  }

  return (
    <div className={className}>
      <canvas
        className={`bg-white h-[${height}px] w-[${width}px]`}
        width={width}
        height={height}
        ref={canvasRef}
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
