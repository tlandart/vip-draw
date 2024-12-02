import { useRef, useEffect, useState } from "react";
import { accountGameSaveDrawing } from "@/api/dbApi";

/* A Canvas component that can be drawn on with the mouse, with undo and reset buttons.
    - canvasRef: will be set to a reference to the pure html canvas
    - setStream: function to set our outgoing stream of the canvas
    - setCanvasSaveFunc: function to set a function that saves and resets the canvas
    - width/height: width/height of canvas
    - lineWidth: width of drawing line
    - minDist: minimum length of line strokes in the drawing
*/

export default function VipCanvas({
  className,
  setStream,
  setCanvasSaveFunc,
  width,
  height,
  lineWidth,
  minDist,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const oldMouse = useRef();

  const [isDrawing, setIsDrawing] = useState(false);
  const [colour, setColour] = useState("#000000");

  // a line is an object with:
  // colour: the colour of the line (a string like "#FF00AA")
  // points: an array of points (x,y)
  const currentLine = useRef({ colour: colour, points: [] });

  // array of all lines (will be replaced with DB)
  const currentDrawing = useRef([]);

  useEffect(function () {
    // set the function
    setCanvasSaveFunc(() => () => {
      // TODO save drawing to db
      console.log("saving drawing", currentDrawing.current);

      accountGameSaveDrawing(currentDrawing.current).then((res) => {
        if (!res.err) {
          console.log("saved drawing");
        } else {
          console.error("Failed to save drawing:", res.err);
        }
      });

      resetCanvas(true);
    });

    setStream(canvasRef.current.captureStream(30));

    ctxRef.current = canvasRef.current.getContext("2d");
    resetCanvas(true);
  }, []);

  function resetCanvas(deleteStoredDrawing = false) {
    if (deleteStoredDrawing) {
      currentLine.current = { colour: colour, points: [] };
      currentDrawing.current = [];
    }
    ctxRef.current.reset();
    ctxRef.current.fillStyle = "#ffffff"; // bg colour
    ctxRef.current.fillRect(0, 0, width, height);
    ctxRef.current.lineWidth = lineWidth;
    ctxRef.current.lineCap = "round";
    ctxRef.current.strokeStyle = colour; // line colour
  }

  function drawLineSegment(x1, y1, x2, y2, lineColour) {
    ctxRef.current.strokeStyle = lineColour;
    ctxRef.current.beginPath(); // <- important to reduce lag
    ctxRef.current.moveTo(x1, y1);
    ctxRef.current.lineTo(x2, y2);
    ctxRef.current.stroke();
    ctxRef.current.closePath(); // <- important to reduce lag
    ctxRef.current.strokeStyle = colour; // set it back to what user picked
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
      currentLine.current = { colour: colour, points: [p] };
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
        currentLine.current.points.push({ x: p.x, y: p.y });
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
    console.log(lines);
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
          drawLineSegment(
            lastPoint.x,
            lastPoint.y,
            point.x,
            point.y,
            line.colour
          );
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

  function changeColour(newColour) {
    setColour(newColour);
    ctxRef.current.strokeStyle = newColour;
  }

  return (
    <div className={className}>
      <div className="flex justify-center">
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
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => changeColour("#000000")}
          className="w-8 h-8 rounded-full cursor-pointer transition-transform transform hover:scale-110"
          style={{ background: "#000000" }}
        ></button>
        <button
          onClick={() => changeColour("#FF0000")}
          className="w-8 h-8 rounded-full cursor-pointer transition-transform transform hover:scale-110"
          style={{ background: "#FF0000" }}
        ></button>
        <button
          onClick={() => changeColour("#00FF00")}
          className="w-8 h-8 rounded-full cursor-pointer transition-transform transform hover:scale-110"
          style={{ background: "#00FF00" }}
        ></button>
        <button
          onClick={() => changeColour("#0000FF")}
          className="w-8 h-8 rounded-full cursor-pointer transition-transform transform hover:scale-110"
          style={{ background: "#0000FF" }}
        ></button>
        <button
          onClick={() => changeColour("#FFFF00")}
          className="w-8 h-8 rounded-full cursor-pointer transition-transform transform hover:scale-110"
          style={{ background: "#FFFF00" }}
        ></button>
        <button
          onClick={() => changeColour("#FFA500")}
          className="w-8 h-8 rounded-full cursor-pointer transition-transform transform hover:scale-110"
          style={{ background: "#FFA500" }}
        ></button>
        <input
          type="color"
          value={colour}
          onChange={(e) => changeColour(e.target.value)}
          className="w-8 h-8 cursor-pointer transition-transform transform"
        />
      </div>
      <div className="flex flex-col items-center justify-center gap-4 mt-4">
        <button
          onClick={() => resetCanvas(true)}
          className="px-4 py-2 rounded transition"
        >
          [Reset]
        </button>
        <button onClick={undoLastLine} className="px-4 py-2 rounded transition">
          [Undo]
        </button>
      </div>
    </div>
  );
}
