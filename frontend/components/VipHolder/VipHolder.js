import VipCanvas from "../VipCanvas/VipCanvas";

/*
  Holds the canvas and video elements for the game.
    - setStream: function to set the canvas's stream
    - remoteVideoRef: will be set to a reference to the video stream
    - idLabelRef: will be set to a reference to the id label
    - setCanvasSaveFunc: set to a function that saves the canvas
    - showCanvas, showVideo: boolean, show corresponding elements
*/

export default function VipHolder({
  setStream,
  remoteVideoRef,
  idLabelRef,
  setCanvasSaveFunc,
  currentWord,
  showCanvas,
  showVideo,
}) {
  return (
    <>
      <span ref={idLabelRef}></span>
      {showCanvas && (
        <>
          <span className="block text-xl">Draw!</span>{" "}
          <span className="block text-xl">Word: {currentWord}</span>
        </>
      )}
      {showVideo && <span className="block text-xl">Guess!</span>}
      {showCanvas && (
        <VipCanvas
          className={"m-2"}
          setStream={setStream}
          setCanvasSaveFunc={setCanvasSaveFunc}
          width={300}
          height={300}
          lineWidth={5}
          minDist={1}
        />
      )}

      {true && (
        <video
          className={`bg-white h-[300px] w-[300px] m-2 ${
            showVideo ? "" : "hidden"
          }`}
          ref={remoteVideoRef}
        />
      )}
    </>
  );
}
