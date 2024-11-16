"use client";

import { useRef, useEffect, useState } from "react";
import {
  gameGuess,
  gameInit,
  gameUpdateStream,
  peerHost,
  peerJoin,
} from "../api/gameApi";
import VipHolder from "../components/VipHolder/VipHolder";

export default function Home() {
  const [stream, setStream] = useState(null); // the outgoing stream of our canvas
  const remoteVideoRef = useRef(null);
  const idLabelRef = useRef(null);
  const [canvasSaveFunc, setCanvasSaveFunc] = useState(null); // function to save canvas. set when the canvas is loaded, so this is defined in VipCanvas

  const inputIdRef = useRef(null); // id input element
  const inputGuessRef = useRef(null); // guess input element

  // game logic
  const [gameState, setGameState] = useState({ start: 0 });
  const playerNum = useRef(null); // client's player number. 0 = host

  useEffect(
    function () {
      console.log("GAME STATE UPDATED", gameState);
      // save the canvas to db if our player should
      // TODO this needs to change for saving other stats.
      // idea: in gameState, a dictionary w booleans "save" = [drawing: 0, correctGuesser: 2, time: 45]
      if (gameState.playerSave === playerNum.current) {
        canvasSaveFunc();
      }
    },
    [gameState]
  );

  useEffect(
    function () {
      if (stream) gameUpdateStream(stream);
    },
    [stream]
  );

  function handleHost() {
    playerNum.current = 0;
    peerHost(setGameState, remoteVideoRef, idLabelRef);
  }

  function handleJoin(event) {
    playerNum.current = 1;
    event.preventDefault();
    const remoteId = inputIdRef.current.value.trim();
    inputIdRef.current.value = "";
    peerJoin(setGameState, remoteId, remoteVideoRef, idLabelRef);
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
        <VipHolder
          setStream={setStream}
          remoteVideoRef={remoteVideoRef}
          idLabelRef={idLabelRef}
          setCanvasSaveFunc={setCanvasSaveFunc}
          currentWord={gameState.currentWord ? gameState.currentWord : ""}
          showCanvas={
            gameState.start === 2 &&
            playerNum.current === gameState.currentPlayer
          }
          showVideo={
            gameState.start === 2 &&
            playerNum.current !== gameState.currentPlayer
          }
        />
        {gameState.start === 2 &&
          playerNum.current !== gameState.currentPlayer && (
            <form onSubmit={handleGuess}>
              <input
                className="text-black"
                ref={inputGuessRef}
                name="guess"
                type="text"
                placeholder="enter guess"
                required
              />
              <button type="submit">[Guess]</button>
            </form>
          )}
      </div>
    </>
  );
}
