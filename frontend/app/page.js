"use client";

import VipGame from "../components/VipGame/VipGame";

export default function Home() {
  const handleSignIn = () => {
    // temporary sign in button
    alert("Sign In button clicked!");
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <button
        onClick={handleSignIn}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        Sign In
      </button>
      <VipGame />
    </div>
  );
}
