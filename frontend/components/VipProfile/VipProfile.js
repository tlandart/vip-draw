import {
  accountUsernameSubmit,
  accountFollowUnfollow,
  accountGetDrawings,
  accountGetFollowersFollowing,
} from "@/api/dbApi";
import VipDisplayCanvas from "../VipDisplayCanvas/VipDisplayCanvas";
import { useRef, useState, useEffect } from "react";

/*
  Draws a given profile.
    - myProfile: object that contains profile information for the current user (to determine their relationship with the drawn user).
        if set, we assume we are not drawing out own profile, OPTIONAL
    - setMyProfile: function to change myProfile at a higher level, OPTIONAL
    - theirProfile: object that contains profile information to be drawn
    - setTheirProfile: function to change profile at a higher level
    - onLogout: function to log out of account, OPTIONAL
    - onClose: function to close this component
    - onError: function to set error text at a higher level
    - onUserClick: function to call when a user the follower/following list is clicked
*/

export default function VipProfile({
  myProfile,
  setMyProfile,
  theirProfile,
  setTheirProfile,
  onClose,
  onLogout,
  onError,
  onUserClick,
}) {
  const inputNewUsernameRef = useRef();

  // the current drawings we are showing, at most 3
  const [drawings, setDrawings] = useState(null);
  const [drawingsPage, setDrawingsPage] = useState(0);
  const [end, setEnd] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(
    function () {
      accountGetDrawings(theirProfile.personalId, drawingsPage).then((res) => {
        let finalDrawing = [];
        for (const dr of res.drawings) {
          finalDrawing.push(JSON.parse(dr));
        }
        setDrawings(finalDrawing);
        if (res.end) setEnd(true);
        else setEnd(false);
      });
    },
    [theirProfile, drawingsPage]
  );

  useEffect(
    function () {
      if (showFollowers) {
        accountGetFollowersFollowing("followers", theirProfile.personalId).then(
          (res) => {
            if (!res.err) setFollowers(res);
            else console.error("Failed to get followers:", res.err);
          }
        );
      }
      if (showFollowing) {
        accountGetFollowersFollowing("following", theirProfile.personalId).then(
          (res) => {
            if (!res.err) setFollowing(res);
            else console.error("Failed to get following:", res.err);
          }
        );
      }
    },
    [showFollowers, showFollowing]
  );

  const handlePrev = () => {
    setDrawingsPage(drawingsPage - 1);
  };

  const handleNext = () => {
    setDrawingsPage(drawingsPage + 1);
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    let pf = await accountUsernameSubmit(
      inputNewUsernameRef.current.value.trim()
    );
    if (!pf.err) {
      setTheirProfile(pf);
    } else {
      onError("Failed to update username.");
    }
  };

  const handleFollow = async (action) => {
    let pf = await accountFollowUnfollow(action, theirProfile.personalId);
    if (!pf.err) {
      setTheirProfile(pf);
    } else {
      onError("Failed to follow/unfollow.");
    }
  };

  const toggleFollowers = () => {
    setShowFollowing(false);
    setShowFollowers(!showFollowers);
  };

  const toggleFollowingMenu = () => {
    setShowFollowers(false);
    setShowFollowing(!showFollowing);
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-white bg-opacity-80 flex flex-col items-center justify-center z-10">
      {theirProfile && (
        <div className="relative w-3/4 h-5/6 bg-gray-100 p-6 rounded-lg shadow-lg">
          <button
            onClick={() => onClose()}
            className="w-7 h-7 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
          >
            X
          </button>
          <h2 className="text-xl font-bold">Profile</h2>

          {myProfile && myProfile.personalId !== theirProfile.personalId && (
            <div>
              {!theirProfile.isFollowing && (
                <button
                  className="bg-blue-500 text-white rounded mt-2 ml-auto"
                  onClick={() => handleFollow("follow")}
                >
                  Follow
                </button>
              )}
              {theirProfile.isFollowing && (
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
              <label className="block text-3xl">
                Username: {theirProfile.username}
              </label>
            </div>
            {!myProfile && (
              <form
                className="flex items-center"
                onSubmit={handleUsernameSubmit}
              >
                <input
                  maxLength={15}
                  type="text"
                  ref={inputNewUsernameRef}
                  required
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
              <button onClick={toggleFollowers} className="block text-sm">
                Followers: {theirProfile.followers}
              </button>
              <button onClick={toggleFollowingMenu} className="block text-sm">
                Following: {theirProfile.following}
              </button>
            </div>

            {showFollowers && (
              <div className="fixed inset-0 flex item-center justify-center z-50">
                <div
                  className="absolute inset-0 bg-black opacity-50"
                  onClick={toggleFollowers}
                ></div>
                <div className="relative z-10 w-1/3 max-h-[50%] overflow-y-auto bg-gray-100 p-6 rounded-lg shadow-lg mt-auto mb-auto">
                  <div className="flex item-center justify-center">
                    <h2 className="text-lg font-bold">Followers</h2>
                    <button
                      className="w-7 h-7 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                      onClick={toggleFollowers}
                    >
                      X
                    </button>
                  </div>
                  <ul>
                    {followers.length > 0 &&
                      followers.map((user, index) => (
                        <li
                          className="hover:bg-white cursor-pointer duration-300 pt-1 pb-1"
                          key={index}
                          onClick={() => {
                            onUserClick(user);
                            toggleFollowers();
                          }}
                        >
                          {user.username}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}

            {showFollowing && (
              <div className="fixed inset-0 flex item-center justify-center z-50">
                <div
                  className="absolute inset-0 bg-black opacity-50"
                  onClick={toggleFollowingMenu}
                ></div>
                <div className="relative z-10 w-1/3 max-h-[50%] overflow-y-auto bg-gray-100 p-6 rounded-lg shadow-lg mt-auto mb-auto">
                  <div className="flex item-center justify-center">
                    <h2 className="text-lg font-bold">Following</h2>
                    <button
                      className="w-7 h-7 absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                      onClick={toggleFollowingMenu}
                    >
                      X
                    </button>
                  </div>
                  <ul>
                    {following.length > 0 &&
                      following.map((user, index) => (
                        <li
                          className="hover:bg-white cursor-pointer duration-300 pt-1 pb-1"
                          key={index}
                          onClick={() => {
                            onUserClick(user);
                            toggleFollowingMenu();
                          }}
                        >
                          {user.username}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {drawings && (
            <div>
              <h1 className="flex justify-center">GALLERY</h1>
              <div className="flex gap-2 justify-center flex-row w-full">
                {drawings.map((drawing, index) => (
                  <VipDisplayCanvas
                    width={100}
                    height={100}
                    drawing={drawing}
                    key={index}
                  />
                ))}
              </div>
              <div className="flex flex-row justify-center mt-2">
                <button
                  className={`w-7 h-7 bg-orange-500 text-white p-2 rounded-full ${
                    drawingsPage <= 0 ? "opacity-35" : ""
                  }`}
                  onClick={handlePrev}
                  disabled={drawingsPage <= 0}
                >
                  &lt;
                </button>
                <button
                  className={`w-7 h-7 bg-orange-500 text-white p-2 rounded-full ${
                    end ? "opacity-35" : ""
                  }
                  `}
                  disabled={end}
                  onClick={handleNext}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-row gap-3 absolute left-2 bottom-12">
            <label className="block text-sm">
              Personal ID: {theirProfile.personalId}
            </label>
            {!myProfile && (
              <button
                onClick={onLogout}
                className="absolute bg-red-500 text-white p-2 rounded mt-4 mx-auto"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
