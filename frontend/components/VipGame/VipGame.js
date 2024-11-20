import { useRef, useEffect, useState } from "react";
import {
  TIMER_DEFAULT,
  gameGuess,
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

/* The main multiplayer game. */

export default function VipGame() {
  const [stream, setStream] = useState(null); // the outgoing stream of our canvas
  const [canvasSaveFunc, setCanvasSaveFunc] = useState(null); // function to save canvas. set when the canvas is loaded, so this is defined in VipCanvas
  const videoElems = useRef(null); // video elements for all the streams

  const idLabelRef = useRef(null);
  const inputIdRef = useRef(null); // id input element
  const inputGuessRef = useRef(null); // guess input element

  const [isJoinGameClicked, setIsJoinGameClicked] = useState(false); // State to track if the Join Game button was clicked
  const [showHostJoinButtons, setShowHostJoinButtons] = useState(true); // State to control visibility of host/join buttons
  const [showBackButton, setShowBackButton] = useState(false); // State for the back button
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
      // TODO this needs to change for saving other stats.
      // idea: in gameState, a dictionary w booleans "save" = [drawing: 0, correctGuesser: 2, time: 45]
      if (
        gameState.playerSave >= 0 &&
        gameState.playerSave === playerNum.current
      )
        canvasSaveFunc();

      // console.log("GAME STATE UPDATED", gameStateToString());
    },
    [gameState]
  );

  function handleHost() {
    playerNum.current = 0;
    peerHost(setGameState, restartTimerFunc, addRemoteStream, idLabelRef);
    setShowHostJoinButtons(false); 
    setShowBackButton(true); 
  }

  const handleJoinGameClick = () => {
    setIsJoinGameClicked((prevState) => !prevState); 
  };

  function checkGameValidity(gameId) {
    return fetch(`http://localhost:4000/check-game/${gameId}`) 
      .then((response) => {
        if (response.ok) {
          return response.json();  // Game ID is valid
        } else {
          return response.json().then((data) => {
            throw new Error(data.message);  
          });
        }
      })
      .catch((error) => {
        console.error(error.message);  
        alert(error.message);  
        return null;  
      });
  }

  function handleJoin(event) {
    event.preventDefault();
    const remoteId = inputIdRef.current.value.trim();
    console.log('Attempting to join game with ID:', remoteId);
    inputIdRef.current.value = ""; 

    // if the game ID exists
    fetch(`http://localhost:4000/get-game/${remoteId}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.message && data.message.includes('active')) {
                console.log('Game is valid, joining...');
                peerJoin(
                    setGameState,
                    restartTimerFunc,
                    addRemoteStream,
                    idLabelRef,
                    remoteId
                );
                setShowBackButton(true); 
                setIsJoinGameClicked(false); 
            } else {
                alert(`The game ID ${remoteId} is invalid or no longer active.`);
            }
        })
        .catch((error) => {
            console.error('Error while checking the game ID:', error);
            alert('An error occurred while checking the game ID.');
        });
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

  function handleTimerChange(seconds) {
    gameTimeChange(seconds);
  }

  function handleBack() {
    console.log("Going back...");
    if (playerNum.current === 0) {
      const hostId = idLabelRef.current.innerHTML.replace("Host ID: ", ""); 
      deleteHostId(hostId); 
    }
    peerDisconnect(stream);

    setShowBackButton(false); // Hide back button when going back
    setShowHostJoinButtons(true); // Show the host/join buttons again
    setIsJoinGameClicked(false); // Hide the join game input field
    setGameState({ start: 0, playerCount: 0 }); // Reset game state

    playerNum.current = -1;
  }

  function deleteHostId(hostId) {
    fetch(`http://localhost:4000/delete-game/${hostId}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          console.log("Host ID deleted from the database.");
        } else {
          console.error("Failed to delete Host ID.");
        }
      })
      .catch((error) => {
        console.error("Error deleting Host ID:", error);
      });
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
      <span>{gameStateToString()}</span>
      <span ref={idLabelRef}></span>

      {gameState.start === 0 && (
        <div className="button-container">
          <h1 className="page-title">The VIP Room</h1>
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

      {showBackButton && (
        <button onClick={handleBack} className="back-button">
          &lt; Back
        </button>
      )}

      {gameState.start === 1 && playerNum.current === 0 && (
        <div className="start-button-container flex items-center justify-center h-screen">
          <button
            onClick={handleStart}
            className="bg-[#ffae00] text-[#875d01] text-lg font-medium w-[200px] h-[50px] rounded-md transition duration-200 flex justify-center items-center hover:brightness-110 active:brightness-90"
          >
            [Start]
          </button>
        </div>
      )}

      <VipTimer
        secondsInit={TIMER_DEFAULT}
        setRestartTimerFunc={setRestartTimerFunc}
        onTimerChange={handleTimerChange}
      />

      {gameState.start === 2 && (
        <>
          <div className="bg-orange-600 text-white p-2">
            {gameState.timeLeft}
          </div>
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
    </>
  );
}
