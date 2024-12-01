import { accountUsernameSubmit, accountFollowUnfollow } from "@/api/dbApi";
import { useRef } from "react";

/*
  Draws a given profile.
    - clientProfile: object that contains profile information for the current user (to determine their relationship with the drawn user).
        if set, we assume we are not drawing out own profile
    - profile: object that contains profile information to be drawn
    - setProfile: function to change profile at a higher level
    - onLogout: function to log out of account
    - onClose: function to close this component
    - onError: function to set error text at a higher level
*/

export default function VipProfile({
  clientProfile,
  profile,
  setProfile,
  onClose,
  onLogout,
  onError,
}) {
  const inputNewUsernameRef = useRef();

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    let pf = await accountUsernameSubmit(
      inputNewUsernameRef.current.value.trim()
    );
    if (!pf.err) {
      setProfile(pf);
    } else {
      onError("Failed to update username.");
    }
  };

  const handleFollow = async (action) => {
    console.log("trying to ", action, profile.personalId);
    let pf = await accountFollowUnfollow(action, profile.personalId);
    if (!pf.err) {
      clientProfile.isFollowing = !clientProfile.isFollowing;
      setProfile(pf);
    } else {
      onError("Failed to follow/unfollow.");
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-80 flex flex-col items-center justify-center">
      {profile && (
        <div className="relative w-3/4 h-1/2 bg-gray-100 p-6 rounded-lg shadow-lg">
          <button
            onClick={() => onClose()}
            className="w-7 h-7 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
          >
            X
          </button>
          <h2 className="text-xl font-bold">Profile</h2>

          {clientProfile && clientProfile.personalId !== profile.personalId && (
            <div>
              {!clientProfile.isFollowing && (
                <button
                  className="bg-blue-500 text-white rounded mt-2 ml-auto"
                  onClick={() => handleFollow("follow")}
                >
                  Follow
                </button>
              )}
              {clientProfile.isFollowing && (
                <button
                  className="bg-red-500 text-white rounded mt-2 ml-auto"
                  onClick={() => handleFollow("unfollow")}
                >
                  Unfollow
                </button>
              )}
            </div>
          )}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm">
                Username: {profile.username}
              </label>
            </div>
            {!clientProfile && (
              <form
                className="flex items-center"
                onSubmit={handleUsernameSubmit}
              >
                <input
                  type="text"
                  ref={inputNewUsernameRef}
                  className="w-full p-2 border border-gray-300 rounded mr-2"
                  placeholder="Enter a new username"
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white p-2 rounded"
                >
                  Update
                </button>
              </form>
            )}
          </div>

          <div className="mb-4">
            <div className="flex justify-start gap-3">
              <label className="block text-sm">
                Followers: {profile.followers}
              </label>
              <label className="block text-sm">
                Following: {profile.following}
              </label>
            </div>
          </div>

          <div className="flex flex-row gap-3 absolute bottom-5">
            {!clientProfile && (
              <button
                onClick={onLogout}
                className="absolute bg-red-500 text-white p-2 rounded mt-4 mx-auto"
              >
                Log Out
              </button>
            )}
            <label className="block text-sm">
              Personal ID: {profile.personalId}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
