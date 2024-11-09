"use client";

import { useRef, useEffect, useState } from "react";
import { Peer } from "peerjs";
import VipHolder from "../components/VipHolder/VipHolder";

export default function Home() {
  const streamRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const inputIdRef = useRef(null); // id input element

  function startGame() {
    const peer = new Peer();

    peer.on("open", function (id) {
      console.log("starting game.", id);
    });

    peer.on("connection", function (conn) {
      conn.on("open", function (data) {
        const call = peer.call(conn.peer, streamRef.current);
        call.on("stream", function (remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play();
        });
      });
    });
  }

  function joinGame(event) {
    event.preventDefault();
    const remoteId = inputIdRef.current.value;
    const peer = new Peer();

    peer.on("open", function (id) {
      console.log("joining game.", remoteId);
      peer.connect(remoteId);
    });

    peer.on("call", function (call) {
      call.answer(streamRef.current);
      call.on("stream", function (remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play();
      });
    });
  }

  return (
    <>
      <button onClick={startGame}>[Start game]</button>
      <form onSubmit={joinGame}>
        <input
          ref={inputIdRef}
          name="peerId"
          type="text"
          placeholder="enter id"
          required
        />
        <button type="submit">[Join game]</button>
      </form>
      <VipHolder streamRef={streamRef} remoteVideoRef={remoteVideoRef} />
    </>
  );
}
