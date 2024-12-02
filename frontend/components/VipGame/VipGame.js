import { useRef, useEffect, useState } from "react";
import {
  TIMER_DEFAULT,
  MAX_ROUNDS,
  gameMessage,
  gameInit,
  peerUpdateStream,
  peerHost,
  peerJoin,
  peerDisconnect,
  gameTimeChange,
} from "../../api/gameApi";
import VipCanvas from "../VipCanvas/VipCanvas";
import VipMessages from "../VipMessages/VipMessages";
import VipTimer from "../VipTimer/VipTimer";
import { accountDeleteGame, accountJoinGame } from "../../api/dbApi";

/* The main multiplayer game. */

export default function VipGame() {
  const [stream, setStream] = useState(null); // the outgoing stream of our canvas
  const [canvasSaveFunc, setCanvasSaveFunc] = useState(null); // function to save canvas. set when the canvas is loaded, so this is defined in VipCanvas
  const videoElems = useRef(null); // video elements for all the streams

  const idLabelRef = useRef(null);
  const inputIdRef = useRef(null); // id input element
  const inputGuessRef = useRef(null); // guess input element

  const [isJoinGameClicked, setIsJoinGameClicked] = useState(false); // State to track if the Join Game button was clicked
  const [showBackButton, setShowBackButton] = useState(false); // State for the back button
  const [errorMessage, setErrorMessage] = useState(""); // State to store error message
  const [fadeOut, setFadeOut] = useState(false); // To track the fade-out effect

  // game logic
  const [gameState, setGameState] = useState({ start: 0, playerCount: 0 });
  const [remoteStreams, setRemoteStreams] = useState([]); // the incoming streams from joined players
  const playerNum = useRef(-1); // client's player number. -1 = invalid; 0 = host

  const [restartTimerFunc, setRestartTimerFunc] = useState();

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
          className={"bg-white h-[300px] w-[300px] m-2"}
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

  useEffect(
    function () {
      if (playerNum.current === -1)
        playerNum.current = gameState.playerCount - 1;

      // save the canvas to db if our player should
      if (
        gameState.playerSave >= 0 &&
        gameState.playerSave === playerNum.current
      ) {
        console.log("1. calling canvas save func");
        canvasSaveFunc();
      }

      // console.log("GAME STATE UPDATED", gameStateToString());
    },
    [gameState]
  );

  async function handleHost() {
    playerNum.current = 0;

    try {
      peerHost(setGameState, restartTimerFunc, addRemoteStream, idLabelRef);
      console.log("Host setup initiated.");
    } catch (error) {
      console.error("Failed to start host:", error);
    }

    setShowBackButton(true);
  }

  const handleJoinGameClick = () => {
    setIsJoinGameClicked((prevState) => !prevState);
  };

  function handleJoin(event) {
    event.preventDefault();
    const remoteId = inputIdRef.current.value.trim();
    console.log("Attempting to join game with ID:", remoteId);

    inputIdRef.current.value = "";
    accountJoinGame(remoteId)
      .then((response) => {
        if (response.err) {
          console.log(response.err);
          setErrorMessage(response.err);
          setFadeOut(false);

          setTimeout(() => {
            setFadeOut(true);
            setTimeout(() => {
              setErrorMessage("");
            }, 500);
          }, 5000);
        } else {
          // Proceed if the game ID is valid
          console.log("Game is valid:", response);
          peerJoin(
            setGameState,
            restartTimerFunc,
            addRemoteStream,
            idLabelRef,
            remoteId
          );

          setShowBackButton(true);
          setIsJoinGameClicked(false);
          setErrorMessage("");
          setIsJoinGameClicked(false);
          setErrorMessage("");
        }
      })
      .catch((err) => {
        console.error("Error while checking game ID:", err);
        setErrorMessage("Error occurred while checking the game ID.");
        setFadeOut(false);

        // Clear the error message after 5 seconds
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            setErrorMessage("");
          }, 500);
        }, 5000);
      });
  }

  function handleStart() {
    gameInit();
  }

  function handleMessage(event) {
    event.preventDefault();
    const guess = inputGuessRef.current.value.trim();
    inputGuessRef.current.value = "";
    gameMessage(playerNum.current, guess);
  }

  function handleTimerChange(seconds) {
    gameTimeChange(seconds);
  }

  function handleBack() {
    console.log("Going back...");
    if (playerNum.current === 0) {
      const hostId = idLabelRef.current.innerHTML
        .replace("Host ID: ", "")
        .trim();
      accountDeleteGame(hostId).catch((err) => {
        console.error("Failed to delete host ID:", err);
      });
      idLabelRef.current.innerHTML = "";
    }
    peerDisconnect();

    setShowBackButton(false); // Hide back button when going back
    setIsJoinGameClicked(false); // Hide the join game input field
    setGameState({ start: 0, playerCount: 0 }); // Reset game state

    playerNum.current = -1;
    window.location.reload();
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

  let rankings = [];
  if (gameState.points && gameState.usernames) {
    for (let i = 0; i < gameState.points.length; i++)
      rankings.push({
        points: gameState.points[i],
        username: gameState.usernames[i],
      });
    rankings = rankings.sort((x, y) => y.points - x.points);
  }

  return (
    <>
      <span>{gameStateToString()}</span>

      <span
        className="text-3xl flex w-fit ml-auto mr-auto mt-5"
        ref={idLabelRef}
      ></span>

      {gameState.start === 0 && (
        <div className="button-container">
          <h1 className="page-title">VIP Draw!</h1>
          <button onClick={handleHost}>[Host game]</button>
          <button onClick={handleJoinGameClick}>[Join game]</button>
          {isJoinGameClicked && (
            <form onSubmit={handleJoin} className="join-form">
              <input
                className="text-black"
                ref={inputIdRef}
                name="peerId"
                type="text"
                placeholder="enter id"
                required
              />
              <button type="submit" className="id-submit">
                [Enter]
              </button>
            </form>
          )}
        </div>
      )}

      {errorMessage && (
        <div
          className={`${
            fadeOut ? "opacity-0" : "opacity-100"
          } transition-opacity duration-500 ease-out p-4 bg-yellow-100 text-red-600 rounded-md mb-4`}
        >
          {errorMessage}
        </div>
      )}

      {gameState.start > 0 && showBackButton && (
        <button onClick={handleBack} className="back-button">
          &lt; Back
        </button>
      )}

      {gameState.start === 1 && (
        <>
          {playerNum.current === 0 && (
            <div className="start-button-container flex items-center justify-center mt-64">
              <button
                onClick={handleStart}
                className={`bg-[#ffae00] text-[#875d01] text-lg font-medium w-[200px] h-[50px] rounded-md transition duration-200 flex justify-center items-center hover:brightness-110 active:brightness-90 ${
                  gameState.playerCount < 2 ? "opacity-35" : ""
                }`}
                disabled={gameState.playerCount < 2}
              >
                {gameState.playerCount < 2 ? "[Need 2 players]" : "[Start]"}
              </button>
            </div>
          )}
          {playerNum.current !== 0 && (
            <div className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black text-xl font-bold z-10">
              Waiting for host to start the game...
            </div>
          )}
          <div className="start-button-container flex flex-col items-center justify-center mt-72">
            Players:
            {gameState.usernames.map((username, index) => (
              <div key={index}>{username}</div>
            ))}
          </div>
        </>
      )}

      <VipTimer
        secondsInit={TIMER_DEFAULT}
        setRestartTimerFunc={setRestartTimerFunc}
        onTimerChange={handleTimerChange}
      />

      {gameState.start === 2 && (
        <>
          <div className="bg-purple-900 text-white p-6 rounded-lg shadow-lg w-full md:w-5/6 mx-auto mt-6">
            <div className="text-center mt-4">
              {showCanvas && (
                <>
                  <span className="block text-xl">Draw!</span>
                  <span className="block text-xl">
                    Word: {gameState.currentWord}
                  </span>
                </>
              )}
              {playerNum.current !== gameState.currentPlayer && (
                <span className="block text-xl">Guess!</span>
              )}
              <div>{gameState.timeLeft}</div>
            </div>
            <div className="text-2xl flex flex-row items-center justify-center h-32">
              Round: {Math.ceil(gameState.round / gameState.points.length) || 0}
            </div>
            <div className="flex flex-row items-center justify-center h-full relative">
              <div className="relative flex flex-col justify-center">
                Points:
                {rankings.map(({ username, points }, index) => (
                  <div key={index}>
                    {1 + index}. {username}: {points}
                  </div>
                ))}
              </div>
              <div className="relative flex justify-center">
                <VipCanvas
                  className={`m-2 ${showCanvas ? "" : "hidden"}`}
                  setStream={setStream}
                  setCanvasSaveFunc={setCanvasSaveFunc}
                  width={300}
                  height={300}
                  minDist={3}
                />
              </div>
              {playerNum.current !== gameState.currentPlayer &&
                videoElems.current[showVideoNum]}
              <VipMessages
                messages={gameState.messages}
                reactions={gameState.reactions}
                inputGuessRef={inputGuessRef}
                handleMessage={handleMessage}
                playerNum={playerNum.current}
                className="ml-6"
              />
            </div>
          </div>
        </>
      )}

      {gameState.start === 3 && (
        <div className="bg-purple-900 text-white p-6 rounded-lg shadow-lg w-full md:w-5/6 mx-auto mt-6">
          <div className="text-2xl flex flex-row items-center justify-center h-32">
            Game over!
          </div>
          <div className="relative flex flex-col justify-center">
            Final points:
            {rankings.map(({ username, points }, index) => (
              <div key={index}>
                {1 + index}. {username}: {points}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
