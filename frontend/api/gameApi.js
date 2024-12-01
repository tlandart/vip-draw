import { Peer } from "peerjs";
import { accountCreateGame } from "./dbApi";

let peer;
let joinConns = []; // list of connections from remote players. used only by a host.
let hostConn; // connection to host. used only by a remote player.
let calls = []; // calls all other players

let gameSt = { start: 1, playerCount: 1, ids: [] }; // local gameState
let setGame = null; // function to set CLIENT gameState (NOT the one just above)
let restartTime = null; // function to reset client timer
let canvStream; // our outgoing canvas stream

/* 
  Peerjs interactions.
*/

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
function createEmptyStream() {
  const canvas = Object.assign(document.createElement("canvas"), {});
  canvas.getContext("2d").fillRect(0, 0, 1, 1);

  const stream = canvas.captureStream();
  const track = stream.getVideoTracks()[0];

  let emptyVid = Object.assign(track, { enabled: false });
  return new MediaStream([emptyVid]);
}

// open host connection
export function peerHost(
  setGameState,
  restartTimerFunc,
  addRemoteStream,
  idLabelRef
) {
  if (peer) {
    console.error("Already connected to a game.");
    return;
  }

  setGame = setGameState;
  restartTime = restartTimerFunc;

  peer = new Peer();

  peer.on("open", async function (id) {
    console.log("starting peer.", id);

    if (!id) {
      console.error("Error: Peer ID is empty. Cannot create host.");
      return;
    }

    idLabelRef.current.innerHTML = "Host ID: " + id;

    gameSt = { ...gameSt, start: 1, playerCount: 1, ids: [id] };
    setGame(gameSt);

    try {
      // Store the host ID in the database
      const response = await accountCreateGame(id);
      if (response.err) {
        console.error("Failed to store Host ID:", response.err);
      } else {
        console.log("Host created successfully:", response);
      }
    } catch (error) {
      console.error("Failed to store Host ID:", error);
    }
  });

  peer.on("connection", function (c) {
    c.on("open", function (data) {
      joinConns.push(c); // add a new connection.

      // increment player count and add the new id
      gameSt = {
        ...gameSt,
        playerCount: gameSt.playerCount + 1,
        ids: [...gameSt.ids, c.peer],
      };
      setGame(gameSt);
      peerHostSend();

      // immediately start a call with the connected peer.
      // call with empty media stream initially, will be replaced when canvas is drawn
      let call = peer.call(
        c.peer,
        canvStream ? canvStream : createEmptyStream()
      );
      call.on("stream", function (remoteStream) {
        addRemoteStream(remoteStream);
      });
      calls.push(call);
    });

    c.on("data", function ({ playerNum: playerNum, message: message }) {
      // peerMessageSend()'s request ends up here.
      // now we can process it like how a host's message is processed
      console.log("received message", message, "from player", playerNum);

      if (/^react:.{1}$/u.test(message)) {
        // matches only "react:*" where * is any character including emojis
        gameReact(message.substring(6));
      } else {
        gameGuess(playerNum, message);
      }
    });
  });
}

// join remoteId session
export function peerJoin(
  setGameState,
  restartTimerFunc,
  addRemoteStream,
  idLabelRef,
  remoteId
) {
  if (peer) {
    console.error("Already connected to a game.");
    return;
  }

  setGame = setGameState;
  restartTime = restartTimerFunc;

  peer = new Peer();

  peer.on("open", function (id) {
    console.log("joining peer.", remoteId);
    idLabelRef.current.innerHTML = "Host ID: " + remoteId;

    let first = true; // flag for the first time receiving a gameState
    hostConn = peer.connect(remoteId);
    hostConn.on("data", function (gameState) {
      if (first) {
        // call every id (other than host, which has already called us, and ourselves)
        for (const theirId of gameState.ids.slice(1)) {
          if (theirId !== id) {
            // if it's not OUR id
            console.log("calling id ", id);
            let call = peer.call(
              theirId,
              canvStream ? canvStream : createEmptyStream()
            );
            call.on("stream", function (remoteStream) {
              // append new stream
              addRemoteStream(remoteStream);
            });
            calls.push(call);
          }
        }
        first = false;
      }
      // receive updates of gameState.
      gameSt = gameState;
      setGame(gameState);

      // if the new gameState is back to original, reset our gameState.
      if (gameSt.start === 0) {
        peerDisconnect(canvStream);
      }
    });
  });

  peer.on("call", function (c) {
    // call with empty media stream initially, will be replaced when canvas is drawn
    c.answer(canvStream ? canvStream : createEmptyStream());
    console.log("answered call from", c.peer);
    c.on("stream", function (remoteStream) {
      addRemoteStream(remoteStream);
    });
    calls.push(c);
  });
}

// sends gameState out as data to all connections
// *only the host should call this function*
export function peerHostSend() {
  for (const conn of joinConns) {
    if (conn && conn.open) {
      conn.send(gameSt);
    } else {
      console.error(
        "Connection to remote player does not exist or is not open."
      );
    }
  }
}

// sends a message made by a remote player (non-host)
// *only a remote player should call this function*
function peerMessageSend(playerNum, message) {
  if (hostConn && hostConn.open) {
    hostConn.send({ playerNum: playerNum, message: message });
    console.log("sent message", playerNum, message);
  } else {
    console.error("Connection to host does not exist or is not open.");
  }
}

// we sent an empty stream when starting the call because the canvas had not yet been loaded. when the canvas is loaded we replace the stream we are sending to every call.
export function peerUpdateStream(stream) {
  if (canvStream) return; // if we already have a stream, this func is not needed (we already would have set the original stream properly when starting the call)
  canvStream = stream;
  for (const call of calls) {
    if (!call) {
      console.log(
        "Attempted to update the stream but could not find current call."
      );
      return;
    }
    // replace the empty stream we're sending with the actual
    // canvas stream, now that it's loaded
    for (const s of call.peerConnection.getSenders()) {
      s.replaceTrack(stream.getVideoTracks()[0]);
    }
  }
}

export function peerDisconnect(stream) {
  console.log("Disconnecting...");

  // Reset the game state to initial state
  gameSt = { start: 0 };
  setGame(gameSt);
  peerHostSend();

  // Close all remote connections
  for (const conn of joinConns) {
    if (conn && conn.open) {
      console.log("Closing connection...");
      conn.close();
    }
  }
  joinConns = [];

  // Close the host connection
  if (hostConn && hostConn.open) {
    console.log("Closing host connection...");
    hostConn.close();
    hostConn = null;
  }

  // Close the call connections
  for (const call of calls) {
    if (call) {
      console.log("Closing call...");
      call.close();
    }
  }
  calls = [];

  // Destroy peer instance
  if (peer) {
    console.log("Destroying peer...");
    peer.destroy();
    peer = null;
  }

  // Stop media stream tracks
  if (stream && stream.getTracks) {
    console.log("Stopping stream...");
    stream.getTracks().forEach((track) => track.stop());
  }
}

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////

/* 
  Logic for the drawing game. These functions take the entire gameState objectively and makes changes. The game component will render the game with the client's associated player number.
*/

export const TIMER_DEFAULT = 45;

// start the game
export function gameInit() {
  // starting state of gameState
  gameSt = {
    ...gameSt,
    start: 2, // 0 = can't start; 1 = waiting to start; 2 = starting/started
    playerSave: -1, // which player should save their drawing when reading this
    currentPlayer: 0, // 0 or 1, the player who is drawing
    correctPlayers: [], // array of player numbers who correctly guessed so far
    points: Array(gameSt.playerCount).fill(0), // array of points. points[x] is player #x's points
    currentWord: randomWord(),
    timeLeft: TIMER_DEFAULT, // time left until next stage
    messages: [],
    reactions: [],
  };
  restartTime();
  peerHostSend(gameSt);
  setGame(gameSt);
}

// message sent by playerNum. updates client gameState accordingly
// note that a "reaction" is just a message "react:*". So players can send custom reactions.
export function gameMessage(playerNum, message) {
  if (playerNum === 0) {
    // host. can process message immediately
    if (/^react:.{1}$/u.test(message)) {
      // matches only "react:*" where * is any character including emojis
      gameReact(message.substring(6));
    } else {
      gameGuess(playerNum, message);
    }
  } else {
    // remote player. must send message to host for processing
    peerMessageSend(playerNum, message);
  }
}

// modify local gameSt by adding msg to the messages, ensuring only the last 5 messages are saved
function addMessage(msg) {
  gameSt.messages.push(msg);
  gameSt.messages = gameSt.messages.slice(-5);
}

// guess received by host connection
// handles the actual logic for a guess.
// should only be called by the host client
function gameGuess(playerNum, guess) {
  if (
    playerNum !== gameSt.currentPlayer &&
    guess === gameSt.currentWord &&
    !(playerNum in gameSt.correctPlayers)
  ) {
    let points = gameSt.points;
    points[playerNum] += gameSt.timeLeft;
    points[gameSt.currentPlayer] += gameSt.timeLeft / 6;
    addMessage(`[Player #${playerNum} correctly guessed!]`);

    if (gameSt.correctPlayers.length + 1 >= gameSt.playerCount - 1) {
      // correct guess and all players guessed it. switch!
      gameSt = {
        ...gameSt,
        playerSave: gameSt.currentPlayer, // current player should save their drawing
        currentPlayer:
          gameSt.currentPlayer + 1 < gameSt.playerCount
            ? gameSt.currentPlayer + 1
            : 0, // cycle to next player
        points: points,
        correctPlayers: [],
        timeLeft: TIMER_DEFAULT,
        currentWord: randomWord(),
      };
      restartTime();
    } else {
      // correct guess and not all players guessed it yet.
      gameSt = {
        ...gameSt,
        playerSave: -1,
        points: points,
        correctPlayers: [...gameSt.correctPlayers, playerNum],
      };
    }
  } else {
    // incorrect guess OR host sending a message.
    addMessage(`Player #${playerNum}: ${guess}`);
    gameSt = {
      ...gameSt,
      playerSave: -1, // on gamestate update, don't save the canvas drawing
    };
  }
  setGame(gameSt);
  peerHostSend();
}

function gameReact(reactionCode) {
  const newReaction = { reaction: reactionCode, timestamp: Date.now() };

  gameSt = {
    ...gameSt,
    reactions: [...gameSt.reactions, newReaction],
    playerSave: -1,
  };
  setGame(gameSt);
  peerHostSend();

  setTimeout(() => {
    gameSt = {
      ...gameSt,
      reactions: gameSt.reactions.filter(
        (r) => r.timestamp !== newReaction.timestamp
      ),
      playerSave: -1,
    };
    setGame(gameSt);
    peerHostSend();
  }, 2000); // remove the reaction that we just added 2 seconds later
}

// change timer to "seconds"
export function gameTimeChange(seconds) {
  if (gameSt.start === 2) {
    gameSt = {
      ...gameSt,
      playerSave: -1,
      timeLeft: seconds,
    };
    setGame(gameSt);
    peerHostSend();
    if (gameSt.timeLeft <= 0) gameTimeout();
  }
}

// time ran out
function gameTimeout() {
  console.log("timer ended");
  if (gameSt.start === 2) {
    gameSt = {
      ...gameSt,
      playerSave: gameSt.currentPlayer, // current player should save their drawing
      currentPlayer:
        gameSt.currentPlayer + 1 < gameSt.playerCount
          ? gameSt.currentPlayer + 1
          : 0, // cycle to next player
      correctPlayers: [],
      timeLeft: TIMER_DEFAULT,
      currentWord: randomWord(),
    };
    restartTime();
    setGame(gameSt);
    peerHostSend();
  }
}

// end the round.
// send all stats and the final drawing to db
export function gameEnd(drawing) {}
