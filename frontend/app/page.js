"use client";

import { useRef, useEffect, useState } from "react";
import { gameGuess, gameInit, setCanvasRef } from "../api/gameApi";
import VipHolder from "../components/VipHolder/VipHolder";

export default function Home() {
  const streamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const idLabelRef = useRef(null);
  const [canvasResetFunc, setCanvasResetFunc] = useState(null);

  const inputIdRef = useRef(null); // id input element
  const inputGuessRef = useRef(null); // guess input element

  // game logic
  const [gameState, setGameState] = useState(null);
  const playerNum = useRef(null); // client's player number. host = 0

  useEffect(
    function () {
      console.log("GAME STATE UPDATED\n" + printGameState());
    },
    [gameState]
  );

  function handleHost() {
    playerNum.current = 0;
    gameInit(
      null,
      setGameState,
      streamRef,
      remoteVideoRef,
      idLabelRef,
      canvasResetFunc
    );
  }

  function handleJoin(event) {
    playerNum.current = 1;
    event.preventDefault();
    const remoteId = inputIdRef.current.value.trim();
    inputIdRef.current.value = "";
    gameInit(
      remoteId,
      setGameState,
      streamRef,
      remoteVideoRef,
      idLabelRef,
      canvasResetFunc
    );
  }

  function handleGuess(event) {
    event.preventDefault();
    const guess = inputGuessRef.current.value.trim();
    inputGuessRef.current.value = "";
    gameGuess(setGameState, playerNum.current, guess);
  }

  // TODO temp function for testing. returns gameState in string form
  function printGameState() {
    if (gameState) {
      return `currentPlayer: ${gameState.currentPlayer}\npoints: ${
        gameState.points
      }\ncurrentWord: ${
        gameState.currentPlayer === playerNum.current
          ? gameState.currentWord
          : "[hidden]"
      }\nYou are player #${playerNum.current}`;
    }
    return "gameState = null";
  }

  return (
    <>
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
      <>
        <VipHolder
          streamRef={streamRef}
          remoteVideoRef={remoteVideoRef}
          idLabelRef={idLabelRef}
          setCanvasResetFunc={setCanvasResetFunc}
          showCanvas={
            gameState && playerNum.current === gameState.currentPlayer
          }
          showVideo={gameState && playerNum.current !== gameState.currentPlayer}
        />
        {gameState && playerNum.current !== gameState.currentPlayer && (
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
      </>
      <span className="whitespace-pre-line">{printGameState()}</span>
    </>
  );
}
