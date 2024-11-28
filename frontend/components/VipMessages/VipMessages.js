import { gameMessage } from "../../api/gameApi";

/*
  Holds the message area for the game.
    - messages: Array of strings
    - reactions: Array of reaction objects
    - inputGuessRef: will be set to a reference to the guess form input
    - handleMessage: function to call when sending a message
    - playerNum: the current player's number, from gameState
*/

export default function VipMessages({
  messages,
  reactions,
  inputGuessRef,
  handleMessage,
  playerNum,
}) {
  const messagesComp = messages.map((message, index) => (
    <div key={index} className="break-words">
      {message}
    </div>
  ));
  return (
    <div className="bg-white text-black p-2 w-80 border-4 border-orange-500 rounded-lg">
      <span className="text-xl">Messages:</span>
      <div className="mb-4">{messagesComp}</div>
      <form onSubmit={handleMessage} className="flex items-center gap-2">
        <input
          className="text-black border-4 mr-2 flex-grow"
          ref={inputGuessRef}
          name="guess"
          type="text"
          placeholder="enter message"
          required
        />
        <button
          type="submit"
          className="w-16 h-10 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </form>
      <div className="flex justify-center mt-4 gap-2">
        <button
          onClick={() => gameMessage(playerNum, "react:👍")}
          className="w-8 h-8 bg-green-400 text-white rounded"
        >
          👍
        </button>
        <button
          onClick={() => gameMessage(playerNum, "react:💖")}
          className="w-8 h-8 bg-red-400 text-white rounded"
        >
          💖
        </button>
        <button
          onClick={() => gameMessage(playerNum, "react:😂")}
          className="w-8 h-8 bg-yellow-300 text-white rounded"
        >
          😂
        </button>
        <button
          onClick={() => gameMessage(playerNum, "react:💩")}
          className="w-8 h-8 bg-orange-900 text-white rounded"
        >
          💩
        </button>
      </div>
      {reactions?.map((r, index) => (
        <div
          key={index}
          className={`absolute text-3xl w-10 h-10 animate-ping`}
          style={{
            top: `${50 + Math.random() * 200}px`,
            left: `${380 + Math.random() * 200}px`,
          }}
        >
          {r.reaction}
        </div>
      ))}
    </div>
  );
}
