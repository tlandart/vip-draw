"use client";

import { useState, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import VipGame from "../components/VipGame/VipGame";
import { ping } from "../api/dbApi";

export default function Home() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState(username);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint = isSignUp ? "signup" : "signin";
      const response = await fetch(`http://localhost:4000/api/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        alert(
          isSignUp ? "Account created successfully!" : "Signed in successfully!"
        );
        localStorage.setItem("user", email);
        setIsAuthenticated(true);
        setShowForm(false);
      } else {
        const data = await response.json();
        setError(
          data.message ||
            (isSignUp ? "Failed to create account" : "Failed to sign in")
        );
      }
    } catch (error) {
      console.error(`Error during ${isSignUp ? "sign-up" : "sign-in"}:`, error);
      setError(isSignUp ? "Failed to create account" : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (response) => {
    try {
      const res = await fetch("http://localhost:4000/api/google-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (res.ok) {
        alert("Google login successful!");
        const data = await res.json();
        const userEmail = data.user.email;
        localStorage.setItem("user", userEmail);
        setIsAuthenticated(true);
      } else {
        setError("Failed to login with Google");
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      setError("Failed to login with Google");
    }
  };

  const handleGoogleLoginFailure = (error) => {
    console.error("Google login error:", error);
    setError("Google login failed");
  };

  const handleLogout = () => {
    const user = localStorage.getItem("user");
    fetch("http://localhost:4000/api/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user }),
    })
      .then((response) => {
        if (response.ok) {
          alert("Logged out successfully");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setShowProfile(false);
        } else {
          setError("Failed to log out");
        }
      })
      .catch((error) => {
        console.error("Error during logout:", error);
        setError("Failed to log out");
      });
  };

  const fetchUserProfile = async (userEmail) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/get-profile/${userEmail}`
      );
      if (response.ok) {
        const profile = await response.json();
        setUsername(profile.username);
        setEmail(profile.email);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleProfileClick = () => {
    const user = localStorage.getItem("user");
    if (user) {
      fetchUserProfile(user);
      setShowProfile(true);
    }
  };

  const handleUsernameChange = (e) => {
    setNewUsername(e.target.value);
  };

  const handleUsernameSubmit = async () => {
    try {
      const userEmail = localStorage.getItem("user");

      const response = await fetch(
        `http://localhost:4000/api/update-username`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userEmail,
            username: newUsername,
          }),
        }
      );

      if (response.ok) {
        setUsername(newUsername);
        alert("Username updated successfully!");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update username.");
      }
    } catch (error) {
      console.error("Error updating username:", error);
      alert("Error updating username.");
    }
  };

  return (
    <GoogleOAuthProvider clientId="821267595423-77gcpdmldn8t63e2ck2jntncld0k7uv9.apps.googleusercontent.com">
      <button onClick={() => ping()}>ping</button>
      <div className="relative h-screen w-full">
        <div className="absolute top-20 right-2">
          {isAuthenticated ? (
            <button
              onClick={handleProfileClick}
              className="bg-blue-500 text-white p-2 rounded"
            >
              Open Profile
            </button>
          ) : (
            <button
              onClick={() => {
                setShowForm(!showForm);
                setIsSignUp(false);
              }}
              className="bg-blue-500 text-white p-2 rounded"
            >
              Sign In
            </button>
          )}
        </div>

        {showProfile && (
          <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-80 flex flex-col items-center justify-center">
            <div className="relative w-3/4 sm:w-1/2 md:w-1/3 bg-gray-100 p-6 rounded-lg shadow-lg">
              <button
                onClick={() => setShowProfile(false)}
                className="w-7 h-7 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
              >
                X
              </button>
              <h2 className="text-xl font-bold mb-4">Profile</h2>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm">Username: {username}</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={handleUsernameChange}
                    className="w-full p-2 border border-gray-300 rounded mr-2"
                    placeholder="Enter a new username"
                  />
                  <button
                    onClick={handleUsernameSubmit}
                    className="bg-blue-500 text-white p-2 rounded"
                  >
                    Update
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white p-2 rounded mt-4 mx-auto"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {showForm && !isAuthenticated && (
          <div className="absolute top-40 right-2 bg-white p-6 rounded shadow-md w-80">
            <h2 className="text-xl mb-4">
              {isSignUp ? "Create an Account" : "Sign In"}
            </h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label className="block text-sm">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-blue-500 text-white p-2 rounded w-full"
                disabled={loading}
              >
                {loading
                  ? isSignUp
                    ? "Signing Up..."
                    : "Signing In..."
                  : isSignUp
                  ? "Sign Up"
                  : "Sign In"}
              </button>

              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className="mt-4 text-sm w-full"
                >
                  Create an account
                </button>
              )}
            </form>
            <div className="my-4">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onFailure={handleGoogleLoginFailure}
              />
            </div>
            <button onClick={() => setShowForm(false)} className="mt-2">
              Cancel
            </button>
          </div>
        )}

        <VipGame />
      </div>
    </GoogleOAuthProvider>
  );
}
