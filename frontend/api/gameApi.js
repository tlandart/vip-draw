import { peerHost, peerJoin, peerHostSend, peerGuessSend } from "./peerApi";

/* 
  Logic for the drawing game. Interacts with the backend API to add information to the database.
*/

let gameState = null;
let canvasReset = null; // function to reset/save canvas

// TODO read this from https://github.com/googlecreativelab/quickdraw-dataset/blob/master/categories.txt
let words = [
  "airplane",
  "ambulance",
  "angel",
  "ant",
  "baseball",
  "belt",
  "bench",
  "bicycle",
  "binoculars",
  "bottlecap",
  "bus",
  "camera",
  "camouflage",
  "campfire",
  "candle",
  "cannon",
  "canoe",
  "car",
  "computer",
  "cookie",
  "cooler",
  "dragon",
  "dresser",
  "drill",
  "drums",
  "duck",
  "fork",
  "helmet",
  "hexagon",
  "laptop",
  "leaf",
  "rabbit",
  "raccoon",
  "radio",
  "rain",
  "rainbow",
  "rake",
  "rhinoceros",
  "spoon",
  "spreadsheet",
  "sword",
  "syringe",
  "table",
  "toothpaste",
  "tornado",
  "tractor",
  "train",
  "violin",
  "watermelon",
  "zebra",
  "zigzag",
];

function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

export function setCanvasRef(ref) {
  canvas = ref.current;
  console.log("fsdfsd", canvas);
}

// start the game by connecting to remoteId.
// if remoteId = null, the caller is the game's host
export function gameInit(
  remoteId = null,
  setGameState,
  streamRef,
  remoteVideoRef,
  idLabelRef,
  canvasResetFunc
) {
  canvasReset = canvasResetFunc;
  if (gameState === null) {
    // starting state of gameState
    gameState = {
      currentPlayer: 0, // 0 or 1, the player who is drawing
      points: [0, 0],
      currentWord: randomWord(),
      timeLeft: 60, // time left until next stage
    };
  }
  if (!remoteId)
    peerHost(setGameState, gameState, streamRef, remoteVideoRef, idLabelRef);
  else peerJoin(setGameState, remoteId, streamRef, remoteVideoRef, idLabelRef);
  setGameState(gameState);
}

// guess by playerNum. does not return anything. instead, uses setGameState
export function gameGuess(setGameState, playerNum, guess) {
  if (playerNum === 0) {
    // host. can process guess immediately
    gameGuessReceived(setGameState, playerNum, guess);
  } else {
    // joined player. must send guess to host for processing
    peerGuessSend(playerNum, guess);
  }
}

// guess is received by host connection
// handles the actual logic for a guess
export function gameGuessReceived(setGameState, playerNum, guess) {
  if (playerNum === gameState.currentPlayer) {
    console.error("Drawer cannot guess");
    return;
  }
  if (guess === gameState.currentWord) {
    // correct guess. switch!
    let points = gameState.points;
    points[playerNum] += gameState.timeLeft;
    points[gameState.currentPlayer] += gameState.timeLeft / 2;
    gameState = {
      ...gameState,
      currentPlayer: gameState.currentPlayer === 0 ? 1 : 0,
      points: points,
      currentWord: randomWord(),
      timeLeft: 60,
    };
    canvasReset();
    console.log("resetting canvas");
  }
  peerHostSend(gameState);
  setGameState(gameState);
}

// time ran out
export function gameTimeout() {}

// end the round.
// send all stats and the final drawing to db
export function gameEnd(drawing) {}
