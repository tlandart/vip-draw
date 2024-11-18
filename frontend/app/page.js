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
  const videoElems = useRef(null); // video elements for all the streams

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

      // console.log("GAME STATE UPDATED", gameStateToString());
    },
    [gameState]
  );

  useEffect(
    function () {
      if (stream) peerUpdateStream(stream);
    },
    [stream]
  );

  useEffect(
    function () {
      // we must have the videoElems as a ref, otherwise the component will re-render the video elements each time a gameState update occurs, causing issues with the first frame of the canvas stream not being rendered (see https://stackoverflow.com/questions/50929159/first-frame-from-capturestream-not-sending)
      videoElems.current = remoteStreams.map((stream, index) => (
        <video
          key={index + new Date()}
          className={`bg-white h-[300px] w-[300px] m-2 ${
            // showVideoNum === index ? "" : "hidden"
            []
          }`}
          ref={(ref) => {
            if (ref) ref.srcObject = stream;
          }}
          autoPlay={true}
        />
      ));
    },
    [remoteStreams]
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
  const showCanvas = playerNum.current === gameState.currentPlayer;

  return (
    <>
      {gameState.start === 0 && (
        <>
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
        </>
      )}
      {gameState.start === 1 && playerNum.current === 0 && (
        <button onClick={handleStart}>[Start]</button>
      )}
      {gameState.start === 2 && (
        <>
          {showCanvas && (
            <>
              <span className="block text-xl">Draw!</span>{" "}
              <span className="block text-xl">
                Word: {gameState.currentWord}
              </span>
            </>
          )}
          {playerNum.current !== gameState.currentPlayer && (
            <span className="block text-xl">Guess!</span>
          )}
          <VipCanvas
            className={`m-2 ${showCanvas ? "" : "hidden"}`}
            setStream={setStream}
            setCanvasSaveFunc={setCanvasSaveFunc}
            width={300}
            height={300}
            lineWidth={5}
            minDist={1}
          />
          {playerNum.current !== gameState.currentPlayer &&
            videoElems.current[showVideoNum]}
          <VipMessages
            messages={gameState.messages}
            inputGuessRef={inputGuessRef}
            handleGuess={handleGuess}
          />
        </>
      )}
      <span ref={idLabelRef}></span>
      <div>{gameStateToString()}</div>
    </>
  );
}
