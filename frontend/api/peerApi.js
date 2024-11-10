import { Peer } from "peerjs";
import { gameGuessReceived } from "./gameApi";

/* 
  Peerjs interactions.
*/

let peer;
let conn;

// returns a promise with the peer's id
export function peerHost(
  setGameState,
  gameState,
  streamRef,
  remoteVideoRef,
  idLabelRef
) {
  if (peer) {
    console.error("Already connected to a game.");
    return;
  }

  peer = new Peer();

  peer.on("open", function (id) {
    console.log("starting peer.", id);
    idLabelRef.current.innerHTML = "Host ID: " + id;
  });

  peer.on("connection", function (c) {
    conn = c;
    conn.on("open", function (data) {
      peerHostSend(gameState);
      const call = peer.call(conn.peer, streamRef.current);
      call.on("stream", function (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play();
      });
    });
    conn.on("data", function ({ playerNum: playerNum, guess: guess }) {
      // peerGuessSend()'s request ends up here
      console.log("received guess", guess, "from player", playerNum);
      gameGuessReceived(setGameState, playerNum, guess);
    });
  });
}

export function peerJoin(
  setGameState,
  remoteId,
  streamRef,
  remoteVideoRef,
  idLabelRef
) {
  if (peer) {
    console.error("Already connected to a game.");
    return;
  }

  peer = new Peer();

  peer.on("open", function (id) {
    console.log("joining peer.", remoteId);
    idLabelRef.current.innerHTML = "Host ID: " + remoteId;

    conn = peer.connect(remoteId);
    conn.on("data", function (gameState) {
      // receive updates of gameState
      setGameState(gameState);
    });
  });

  peer.on("call", function (call) {
    call.answer(streamRef.current);
    call.on("stream", function (remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play();
    });
  });
}

// sends gameState out as data to the peer
// *only the host should call this function*
export function peerHostSend(gameState) {
  if (conn && conn.open) {
    conn.send(gameState);
    console.log("sent", gameState);
  } else {
    console.error("Connection does not exist or is not open.");
  }
}

// sends a guess made by a non-host
// *only the non-host should call this function*
export function peerGuessSend(playerNum, guess) {
  if (conn && conn.open) {
    conn.send({ playerNum: playerNum, guess: guess });
    console.log("sent guess", playerNum, guess);
  } else {
    console.error("Connection does not exist or is not open.");
  }
}
