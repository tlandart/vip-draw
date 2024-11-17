"use client";

import { useRef, useEffect, useState } from "react";
import {
  gameGuess,
  gameInit,
  peerUpdateStream,
  peerHost,
  peerJoin,
} from "../api/gameApi";
import VipCanvas from "../components/VipCanvas/VipCanvas";
import VipMessages from "../components/VipMessages/VipMessages";

export default function Home() {
  const [stream, setStream] = useState(null); // the outgoing stream of our canvas
  const idLabelRef = useRef(null);
  const [canvasSaveFunc, setCanvasSaveFunc] = useState(null); // function to save canvas. set when the canvas is loaded, so this is defined in VipCanvas
  const [canvasRefreshFunc, setCanvasRefreshFunc] = useState(null); // function to refresh canvas. set when the canvas is loaded, so this is defined in VipCanvas

  const inputIdRef = useRef(null); // id input element
  const inputGuessRef = useRef(null); // guess input element

  // game logic
  const [gameState, setGameState] = useState({ start: 0, playerCount: 0 });
  const [remoteStreams, setRemoteStreams] = useState([]); // the incoming streams from joined players
  const playerNum = useRef(-1); // client's player number. -1 = invalid; 0 = host

  useEffect(
    function () {
      if (playerNum.current === -1)
        playerNum.current = gameState.playerCount - 1;

      // save the canvas to db if our player should
      // TODO this needs to change for saving other stats.
      // idea: in gameState, a dictionary w booleans "save" = [drawing: 0, correctGuesser: 2, time: 45]
      if (gameState.playerSave === playerNum.current) canvasSaveFunc();

      // see https://stackoverflow.com/questions/50929159/first-frame-from-capturestream-not-sending
      // strangely, a javascript canvas stream doesn't actually transmit a live feed of a canvas UNTIL a change in the canvas occurs. every time the gameState changes, the video element here refreshes, meaning an update to the canvas stream needs to occur before it is properly shown.
      if (canvasRefreshFunc) canvasRefreshFunc();

      // console.log("GAME STATE UPDATED", gameStateToString());
    },
    [gameState]
  );

  useEffect(
    function () {
      console.log("STREAM CHANGED", stream);
      if (stream) peerUpdateStream(stream);
    },
    [stream]
  );

  function addRemoteStream(s) {
    setRemoteStreams((remoteStreams) => [...remoteStreams, s]);
  }

  function handleHost() {
    playerNum.current = 0;
    peerHost(setGameState, addRemoteStream, idLabelRef);
  }

  function handleJoin(event) {
    event.preventDefault();
    const remoteId = inputIdRef.current.value.trim();
    inputIdRef.current.value = "";
    peerJoin(setGameState, addRemoteStream, idLabelRef, remoteId);
  }

  function handleStart() {
    gameInit();
  }

  function handleGuess(event) {
    event.preventDefault();
    const guess = inputGuessRef.current.value.trim();
    inputGuessRef.current.value = "";
    gameGuess(playerNum.current, guess);
  }

  // TODO for debugging
  function gameStateToString() {
    let acc = "";
    for (const s in gameState) {
      acc += s + ": " + gameState[s] + "\t|\t";
    }
    return acc + "playerNum: " + playerNum.current;
  }

  // which video stream to show given gameState
  // there is no remote stream for ourselves (obviously), so we skip that when indexing each player
  const showVideoNum =
    gameState.currentPlayer > playerNum.current
      ? gameState.currentPlayer - 1
      : gameState.currentPlayer;
  const showCanvas =
    gameState.start === 2 && playerNum.current === gameState.currentPlayer;

  return (
    <>
      {gameState.start === 0 && (
        <div>
          <button onClick={handleHost}>[Host game]</button>
          <form onSubmit={handleJoin}>
            <input
              className="text-black"
              ref={inputIdRef}
              name="peerId"
              type="text"
              placeholder="enter id"
              required
            />
            <button type="submit">[Join game]</button>
          </form>
        </div>
      )}
      {gameState.start === 1 && playerNum.current === 0 && (
        <button onClick={handleStart}>[Start]</button>
      )}
      <div className={gameState.start ? "" : "hidden"}>
        <span ref={idLabelRef}></span>
        {showCanvas && (
          <>
            <span className="block text-xl">Draw!</span>{" "}
            <span className="block text-xl">Word: {gameState.currentWord}</span>
          </>
        )}
        {gameState.start === 2 &&
          playerNum.current !== gameState.currentPlayer && (
            <span className="block text-xl">Guess!</span>
          )}

        <VipCanvas
          className={`m-2 ${showCanvas ? "" : "hidden"}`}
          setStream={setStream}
          setCanvasSaveFunc={setCanvasSaveFunc}
          setCanvasRefreshFunc={setCanvasRefreshFunc}
          width={300}
          height={300}
          lineWidth={5}
          minDist={1}
        />

        {gameState.start === 2 &&
          playerNum.current !== gameState.currentPlayer &&
          remoteStreams.map((stream, index) => (
            <video
              key={index + new Date()}
              className={`bg-red-600 h-[300px] w-[300px] m-2 ${
                showVideoNum === index ? "" : "hidden"
              }`}
              ref={(ref) => {
                if (ref && ref.srcObject !== stream) {
                  console.log(ref.srcObject);
                  console.log(stream);
                  ref.srcObject = stream;
                }
              }}
              autoPlay={true}
            />
          ))}
        {gameState.start === 2 && (
          <VipMessages
            messages={gameState.messages}
            inputGuessRef={inputGuessRef}
            handleGuess={handleGuess}
          />
        )}
      </div>
      <div>{gameStateToString()}</div>
    </>
  );
}
