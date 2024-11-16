import { Peer } from "peerjs";

/* 
  Peerjs interactions.
*/

let peer;
let conn;
let call;

let gameSt = { start: 1 }; // local gameState
let setGame = null; // function to set CLIENT gameState (NOT the one just above)

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

// from https://github.com/peers/peerjs/issues/323#issuecomment-477349226
function createEmptyVideoTrack() {
  const canvas = Object.assign(document.createElement("canvas"), {});
  canvas.getContext("2d").fillRect(0, 0, 1, 1);

  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];

  return Object.assign(track, { enabled: false });
}

function createEmptyStream() {
  return new MediaStream([createEmptyVideoTrack()]);
}

// open host connection
export function peerHost(setGameState, remoteVideoRef, idLabelRef) {
  if (peer) {
    console.error("Already connected to a game.");
    return;
  }

  setGame = setGameState;

  peer = new Peer();

  peer.on("open", function (id) {
    console.log("starting peer.", id);
    idLabelRef.current.innerHTML = "Host ID: " + id;
    setGame({ ...gameSt, start: 1 });
  });

  peer.on("connection", function (c) {
    conn = c;
    conn.on("open", function (data) {
      peerHostSend();
      // call with empty media stream initially, will be replaced when canvas is drawn
      call = peer.call(conn.peer, createEmptyStream());
      call.on("stream", function (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play();
      });
    });
    conn.on("data", function ({ playerNum: playerNum, guess: guess }) {
      // peerGuessSend()'s request ends up here
      console.log("received guess", guess, "from player", playerNum);
      gameGuessReceived(playerNum, guess);
    });
  });
}

// join remoteId session
export function peerJoin(setGameState, remoteId, remoteVideoRef, idLabelRef) {
  if (peer) {
    console.error("Already connected to a game.");
    return;
  }

  setGame = setGameState;

  peer = new Peer();

  peer.on("open", function (id) {
    console.log("joining peer.", remoteId);
    idLabelRef.current.innerHTML = "Host ID: " + remoteId;

    conn = peer.connect(remoteId);
    conn.on("data", function (gameState) {
      // receive updates of gameState.
      // console.log("received", gameState);
      setGame(gameState);
    });
  });

  peer.on("call", function (c) {
    call = c;
    // call with empty media stream initially, will be replaced when canvas is drawn
    c.answer(createEmptyStream());
    c.on("stream", function (remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play();
    });
  });
}

// sends gameState out as data to the peer
// *only the host should call this function*
function peerHostSend() {
  if (conn && conn.open) {
    conn.send(gameSt);
    // console.log("sent", gameSt);
  } else {
    console.error("Connection does not exist or is not open.");
  }
}

// sends a guess made by a remote player (non-host)
// *only a remote player should call this function*
function peerGuessSend(playerNum, guess) {
  if (conn && conn.open) {
    conn.send({ playerNum: playerNum, guess: guess });
    console.log("sent guess", playerNum, guess);
  } else {
    console.error("Connection does not exist or is not open.");
  }
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

/* 
  Logic for the drawing game. These functions take the entire gameState objectively and makes changes. The game component will render the game with the client's associated player number.
*/

// start the game
export function gameInit() {
  // starting state of gameState
  gameSt = {
    start: 2, // 0 = can't start; 1 = waiting to start; 2 = starting/started
    playerSave: -1, // which player should save their drawing when reading this
    currentPlayer: 0, // 0 or 1, the player who is drawing
    points: [0, 0],
    currentWord: randomWord(),
    timeLeft: 60, // time left until next stage
    messages: [],
  };
  peerHostSend(gameSt);
  setGame(gameSt);
}

// we need to send an empty stream when starting the call because the canvas has not yet been loaded when the call starts. when the canvas is loaded it replaces the stream
export function gameUpdateStream(stream) {
  if (!call)
    console.error(
      "Attempted to update the stream but could not find current call."
    );
  // replace the empty stream we're sending with the actual
  // canvas stream, now that it's loaded
  for (const s of call.peerConnection.getSenders()) {
    s.replaceTrack(stream.getVideoTracks()[0]);
  }
}

// guess by playerNum. updates client gameState accordingly
export function gameGuess(playerNum, guess) {
  if (playerNum === 0) {
    // host. can process guess immediately
    gameGuessReceived(playerNum, guess);
  } else {
    // remote player. must send guess to host for processing
    peerGuessSend(playerNum, guess);
  }
}

// modify local gameSt by adding msg to the messages, ensuring only the last 5 messages are saved
function addMessage(msg) {
  gameSt.messages.push(msg);
  gameSt.messages = gameSt.messages.slice(-5);
}

// guess is received by host connection
// handles the actual logic for a guess
export function gameGuessReceived(playerNum, guess) {
  if (playerNum !== gameSt.currentPlayer && guess === gameSt.currentWord) {
    // correct guess. add to chat, then switch!
    let points = gameSt.points;
    points[playerNum] += gameSt.timeLeft;
    points[gameSt.currentPlayer] += gameSt.timeLeft / 2;
    addMessage(`[Player #${playerNum} correctly guessed!]`);
    // set it this way in order to trigger an update when setGame() is called
    gameSt = {
      ...gameSt,
      playerSave: gameSt.currentPlayer, // current player should save their drawing
      currentPlayer: gameSt.currentPlayer === 0 ? 1 : 0,
      points: points,
      currentWord: randomWord(),
    };
  } else {
    // incorrect guess OR host sending a message. set playerSave back to -1 and add to chat
    addMessage(`Player #${playerNum}: ${guess}`);
    gameSt = {
      ...gameSt,
      playerSave: -1,
    };
  }
  peerHostSend(gameSt);
  setGame(gameSt);
}

// time ran out
export function gameTimeout() {}

// end the round.
// send all stats and the final drawing to db
export function gameEnd(drawing) {}
