/*
  Holds the message area for the game.
    - messages: Array of strings
    - inputGuessRef: will be set to a reference to the guess form input
    - handleGuess: function to call when sending a message
*/

export default function VipMessages({ messages, inputGuessRef, handleGuess }) {
  const messagesComp = messages.map((message, index) => (
    <div key={index}>{message}</div>
  ));
  return (
    <div className="bg-white text-black">
      <span className="text-xl">Messages:</span>
      {messagesComp}
      <form onSubmit={handleGuess}>
        <input
          className="text-black border-4"
          ref={inputGuessRef}
          name="guess"
          type="text"
          placeholder="enter message"
          required
        />
        <button type="submit">[Send]</button>
      </form>
    </div>
  );
}
