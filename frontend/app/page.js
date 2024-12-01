"use client";

import { useState, useEffect, useRef } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import VipGame from "../components/VipGame/VipGame";
import { getSessionId, ping } from "../api/dbApi";

export default function Home() {
  const [profile, setProfile] = useState(null);
  const inputEmailRef = useRef();
  const inputPasswordRef = useRef();
  const inputNewUsernameRef = useRef();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFollowPanel, setShowFollowPanel] = useState(false);
  const [followPersonalId, setFollowPersonalId] = useState("");

  useEffect(() => {
    const sessionId = getSessionId();
    if (sessionId) {
      fetchUserProfile();
    }
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const endpoint = isSignUp ? "signup" : "signin";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/api/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: inputEmailRef.current.value.trim(),
            password: inputPasswordRef.current.value.trim(),
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        alert(
          isSignUp ? "Account created successfully!" : "Signed in successfully!"
        );
        const profile = await response.json();
        setProfile(profile);
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/api/google-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential: response.credential }),
          credentials: "include",
        }
      );

      if (res.ok) {
        alert("Google login successful!");
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
    fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          alert("Logged out successfully");
          setProfile(null);
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

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/api/get-profile/${getSessionId()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (response.ok) {
        const profile = await response.json();
        setProfile(profile);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleProfileClick = () => {
    fetchUserProfile();
    setShowProfile(true);
  };

  const handleUsernameSubmit = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/api/update-username`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: getSessionId(),
            username: inputNewUsernameRef.current.value.trim(),
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const profile = await response.json();
        setProfile(profile);
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

  const handleFollowSubmit = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND}/api/follow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: getSessionId(),
            theirPersonalId: followPersonalId,
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const profile = await response.json();
        setProfile(profile);
        alert("Followed successfully!");
        setShowFollowPanel(false);
      } else {
        const data = await response.json();
        if (data.message === "You are already following this user.") {
          setError("You are already following this user.");
        } else {
          setError(data.message || "Failed to follow");
        }
      }
    } catch (error) {
      console.error("Error following user:", error);
      setError("Error following user");
    }
  };

  const handleFollowPanelClose = () => {
    setShowFollowPanel(false);
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
                  <label className="block text-sm">
                    Username: {profile.username}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="text"
                    ref={inputNewUsernameRef}
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
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm">
                    Followers: {profile.followers}
                  </label>
                  <label className="block text-sm">
                    Following: {profile.following}
                  </label>
                  <label className="block text-sm">
                    Personal ID: {profile.personalId}
                  </label>
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
        <div className="absolute bottom-20 right-2">
          {isAuthenticated && (
            <button
              onClick={() => setShowFollowPanel(true)}
              className="bg-blue-500 text-white p-2 rounded"
            >
              Follow Someone
            </button>
          )}
        </div>

        {showFollowPanel && (
          <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-80 flex flex-col items-center justify-center">
            <div className="relative w-3/4 sm:w-1/2 md:w-1/3 bg-gray-100 p-6 rounded-lg shadow-lg">
              <button
                onClick={handleFollowPanelClose}
                className="w-7 h-7 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
              >
                X
              </button>
              <h2 className="text-xl font-bold mb-4">Follow Someone</h2>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="mb-4">
                <label className="block text-sm">Enter Personal ID:</label>
                <input
                  type="text"
                  value={followPersonalId}
                  onChange={(e) => setFollowPersonalId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded mt-2"
                  placeholder="Personal ID"
                />
              </div>
              <button
                onClick={handleFollowSubmit}
                className="bg-blue-500 text-white p-2 rounded mt-4"
              >
                Follow
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
                  ref={inputEmailRef}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm">Password</label>
                <input
                  type="password"
                  ref={inputPasswordRef}
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
