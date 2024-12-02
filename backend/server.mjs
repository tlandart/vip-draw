import express from "express";
import { createClient } from "redis";
import bodyParser from "body-parser";
import { OAuth2Client } from "google-auth-library";
import session from "express-session";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
// import * as https from "https";
import * as http from "http";
// import { createServer } from "http";
import { parse, serialize } from "cookie";

const app = express();
const PORT = 4000;

const DRAWINGS_PER_PAGE = 3;

const CLIENT_ID =
  "821267595423-77gcpdmldn8t63e2ck2jntncld0k7uv9.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Origin, Accept, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: false,
      domain: process.env.FRONTEND_DOMAIN,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
    },
  })
);

app.use(function (req, res, next) {
  console.log("Request", req.method, req.url, req.body);
  next();
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:6379`,
});

redisClient.on("connect", () => {
  console.log("Connected to Redis.");
});

redisClient.on("error", (err) => {
  console.error("Redis client error:", err);
});

redisClient.connect().catch((err) => {
  console.error("Failed to connect to Redis:", err);
});

app.get("/api/ping", (req, res) => {
  res.json("pong");
});

const isAuthenticated = function (req, res, next) {
  console.log("req.session.draw_session_id is", req.session.draw_session_id);
  if (!req.session.draw_session_id) return res.status(401).end("access denied");
  next();
};

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json("Email and password are required.");
  }

  try {
    const existingUser = await redisClient.get(`email:${email}`);
    if (existingUser) {
      return res.status(400).json("Email already in use.");
    }

    const personalId = uuidv4();
    const sessionId = uuidv4();
    const defaultUsername = `Drawer#${Math.floor(Math.random() * 10000)}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = {
      personalId,
      sessionId: sessionId,
      email: email,
      hash: hashedPassword,
      username: defaultUsername,
      followers: 0,
      following: 0,
    };

    await redisClient.hSet(`user:${personalId}`, user);
    await redisClient.set(`email:${email}`, personalId);
    await redisClient.set(`sessionId:${sessionId}`, personalId);
    // start a session
    req.session.draw_session_id = sessionId;
    res.setHeader(
      "Set-Cookie",
      serialize("draw_session_id", sessionId, {
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        path: "/",
        domain: process.env.FRONTEND_DOMAIN,
        secure: process.env.COOKIE_SECURE === "true",
        httpOnly: false,
      })
    );
    res.status(200).json(user);
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json("Failed to create account");
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json("Email and password are required.");
  }

  try {
    const personalId = await redisClient.get(`email:${email}`);
    const existingUser = await redisClient.hGetAll(`user:${personalId}`);

    if (!existingUser || Object.keys(existingUser).length === 0) {
      return res.status(400).json("User not found.");
    }

    const match = await bcrypt.compare(password, existingUser.hash);

    if (!match) {
      return res.status(400).json("Incorrect password.");
    }

    // start a session
    req.session.draw_session_id = existingUser.sessionId;
    res.setHeader(
      "Set-Cookie",
      serialize("draw_session_id", existingUser.sessionId, {
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        path: "/",
        domain: process.env.FRONTEND_DOMAIN,
        secure: process.env.COOKIE_SECURE === "true",
        httpOnly: false,
      })
    );
    res.status(200).json(existingUser);
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json("Failed to sign in");
  }
});

app.post("/api/google-login", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json("Credential is required.");
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name } = payload;
    let user = await redisClient.hGetAll(`user:${sub}`);

    if (Object.keys(user).length === 0) {
      const defaultUsername = `Drawer#${Math.floor(Math.random() * 10000)}`;
      const personalId = sub;
      const sessionId = uuidv4();

      user = {
        personalId,
        sessionId: sessionId,
        email: email,
        username: defaultUsername,
        followers: 0,
        following: 0,
      };

      await redisClient.hSet(`user:${personalId}`, user);
      await redisClient.set(`email:${email}`, personalId);
      await redisClient.set(`sessionId:${sessionId}`, personalId);
      console.log(
        `New user created for ${email} with username ${defaultUsername}.`
      );
    } else {
      console.log(`User ${email} exists, signing in.`);
      user.followers = user.followers || 0;
      user.following = user.following || 0;
    }

    // start a session
    req.session.draw_session_id = user.sessionId;
    res.setHeader(
      "Set-Cookie",
      serialize("draw_session_id", user.sessionId, {
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        path: "/",
        domain: process.env.FRONTEND_DOMAIN,
        secure: process.env.COOKIE_SECURE === "true",
        httpOnly: false,
      })
    );
    res.status(200).json(user);
  } catch (err) {
    console.error("Error verifying Google ID token:", err);
    res.status(500).json("Failed to authenticate user.");
  }
});

app.post("/api/logout", isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json("Failed to log out");
    }
    res.clearCookie("draw_session_id");
    res.status(200).json("Logged out successfully");
  });
});

app.post("/join-game/:hostId", isAuthenticated, async (req, res) => {
  const { hostId } = req.params;
  const { sessionId } = req.body;

  // ensure it is really the user
  console.log("sessionId:", sessionId);
  console.log("req.session.draw_session_id:", req.session.draw_session_id);
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  console.log(`Attempting to retrieve Host ID: ${hostId}`);

  try {
    const reply = await redisClient.lRange(`game:${hostId}`, 0, 0);
    if (Object.keys(reply).length > 0) {
      console.log(`Host ID found: ${hostId}`);

      const personalId = await redisClient.get(`sessionId:${sessionId}`);

      await redisClient.rPush(`game:${hostId}`, personalId);

      res.status(200).json(`Host ID ${hostId} is active.`);
    } else {
      console.error(`Host ID not found in Redis: ${hostId}`);
      res.status(404).json(`Host ID ${hostId} not found.`);
    }
  } catch (err) {
    console.error("Error retrieving Host ID:", err);
    res.status(500).json("Failed to retrieve Host ID.");
  }
});

app.post("/create-game", isAuthenticated, async (req, res) => {
  const { sessionId, hostId } = req.body;

  if (!sessionId || !hostId)
    return res.status(400).json("Session ID and Host ID is required.");

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  try {
    const personalId = await redisClient.get(`sessionId:${sessionId}`);

    await redisClient.rPush(`game:${hostId}`, personalId);
    console.log(`Host ID ${hostId} stored successfully.`);
    res.status(200).json(`Host ID ${hostId} created successfully.`);
  } catch (err) {
    console.error("Error storing Host ID:", err);
    res.status(500).json("Failed to store Host ID.");
  }
});

app.delete("/delete-game/:hostId", isAuthenticated, async (req, res) => {
  const { hostId } = req.params;
  const { sessionId } = req.body;

  if (!sessionId || !hostId)
    return res.status(400).json("Session ID and Host ID is required.");

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  try {
    const personalId = await redisClient.get(`sessionId:${sessionId}`);
    const hostPersonalId = await redisClient.lIndex(`game:${hostId}`, 0, 0);

    // ensure it is the host
    if (personalId !== hostPersonalId) return res.status(403).end("forbidden");

    console.log(`Attempting to delete Host ID: ${hostId}`);

    redisClient.del(`game:${hostId}`, (err, reply) => {
      if (err) {
        console.error("Error deleting Host ID from Redis:", err);
        return res.status(500).json("Internal Server Error");
      }

      if (reply === 1) {
        console.log(`Successfully deleted Host ID: ${hostId}`);
        res.status(200).json("Host ID deleted");
      } else {
        console.error(`Host ID not found in Redis: ${hostId}`);
        res.status(404).json("Host ID not found");
      }
    });
  } catch (err) {
    console.error("Error deleting Host ID:", err);
    res.status(500).json("Failed to delete Host ID.");
  }
});

app.get("/game-usernames", isAuthenticated, async (req, res) => {
  const { sessionId, hostId } = req.query;

  if (!sessionId || !hostId)
    return res.status(400).json("Session ID and Host ID is required.");

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  try {
    const personalIds = await redisClient.lRange(`game:${hostId}`, 0, -1);
    let usernames = [];

    // get usernames from each personalId
    for (const id of personalIds) {
      usernames.push(await redisClient.hGet(`user:${id}`, "username"));
    }

    res.status(200).json(usernames);
  } catch (err) {
    console.error("Error getting usernames from Host ID:", err);
    res.status(500).json("Failed to get usernames from Host ID.");
  }
});

app.post("/save-drawing", isAuthenticated, async (req, res) => {
  const { sessionId, drawing } = req.body;

  if (!sessionId || !drawing || drawing.length <= 0) {
    return res.status(400).json("sessionId and drawing are required.");
  }

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  const personalId = await redisClient.get(`sessionId:${sessionId}`);

  try {
    await redisClient.lPush(`drawings:${personalId}`, JSON.stringify(drawing));
    res.status(200);
  } catch (error) {
    console.error("Error saving drawing:", error);
    res.status(500).json("Failed to save drawing.");
  }
});

app.get("/get-drawing/", isAuthenticated, async (req, res) => {
  const { personalId, page } = req.query;

  if (!personalId || !page) {
    return res.status(400).json("personalId and page are required.");
  }

  try {
    const length = await redisClient.lLen(`drawings:${personalId}`);
    if (page * DRAWINGS_PER_PAGE > length || page < 0)
      return res.status(400).json("page index out of bounds.");

    const drawings = await redisClient.lRange(
      `drawings:${personalId}`,
      page * DRAWINGS_PER_PAGE,
      page * DRAWINGS_PER_PAGE + DRAWINGS_PER_PAGE - 1
    );

    res.status(200).json({
      drawings: drawings,
      end: (page + 1) * DRAWINGS_PER_PAGE > length,
    });
  } catch (error) {
    console.error("Error getting drawings:", error);
    res.status(500).json("Failed to get drawings.");
  }
});

app.get("/api/get-profile/", async (req, res) => {
  const { sessionId, personalId } = req.query;

  let myPersonalId, theirPersonalId;

  if ((!personalId || personalId === "null") && !sessionId)
    return res.status(400).json("Session ID or personalId is required.");
  else if (!personalId || personalId === "null") {
    // if personalId is null, get their own profile from sessionid
    const a = await redisClient.get(`sessionId:${sessionId}`);
    myPersonalId = a;
    theirPersonalId = a;
  } else if (!sessionId) {
    // if sessionId is null, get their profile
    theirPersonalId = personalId;
  } else {
    // if both are present, find their profile while checking if ours follows it
    myPersonalId = await redisClient.get(`sessionId:${sessionId}`);
    theirPersonalId = personalId;
  }

  try {
    let userProfile = await redisClient.hGetAll(`user:${theirPersonalId}`);

    if (Object.keys(userProfile).length === 0) {
      return res.status(404).json("User not found.");
    }

    // if the user that called this (sessionId) is following personalId
    // (which could be themselves, in which case this means nothing),
    // flag it in the returned object
    userProfile.isFollowing = false;
    if (myPersonalId) {
      const personalIds = await redisClient.lRange(
        `following:${myPersonalId}`,
        0,
        -1
      );
      for (const id of personalIds) {
        if (id == theirPersonalId) {
          userProfile.isFollowing = true;
        }
      }
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json("Failed to fetch user profile");
  }
});

app.post("/api/update-username", isAuthenticated, async (req, res) => {
  const { sessionId, username } = req.body;

  if (!sessionId || !username) {
    return res.status(400).json("personalId and username are required.");
  }

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  const personalId = await redisClient.get(`sessionId:${sessionId}`);

  try {
    let user = await redisClient.hGetAll(`user:${personalId}`);

    if (Object.keys(user).length === 0) {
      return res.status(404).json("User not found.");
    }

    await redisClient.hSet(`user:${personalId}`, { username });
    user.username = username;
    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json("Failed to update username.");
  }
});

app.post("/api/follow", isAuthenticated, async (req, res) => {
  const { sessionId, theirPersonalId } = req.body;

  if (!sessionId || !theirPersonalId) {
    return res
      .status(400)
      .json("Both your sessionId and their personalId are required.");
  }

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  const myPersonalId = await redisClient.get(`sessionId:${sessionId}`);
  if (myPersonalId === theirPersonalId) return res.status(403).end("forbidden");

  try {
    const userProfile = await redisClient.hGetAll(`user:${theirPersonalId}`);

    if (Object.keys(userProfile).length === 0) {
      return res.status(404).json("User not found.");
    }

    const personalIds = await redisClient.lRange(
      `following:${myPersonalId}`,
      0,
      -1
    );

    for (const id of personalIds) {
      if (id == theirPersonalId) {
        return res.status(400).json("You are already following this user.");
      }
    }

    await redisClient.rPush(`followers:${theirPersonalId}`, myPersonalId);
    await redisClient.rPush(`following:${myPersonalId}`, theirPersonalId);
    await redisClient.hIncrBy(`user:${myPersonalId}`, "following", 1);
    await redisClient.hIncrBy(`user:${theirPersonalId}`, "followers", 1);

    userProfile.followers++;
    userProfile.isFollowing = true;

    // return the unfollowed user's profile
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json("Failed to follow user.");
  }
});

app.post("/api/unfollow", isAuthenticated, async (req, res) => {
  const { sessionId, theirPersonalId } = req.body;

  if (!sessionId || !theirPersonalId) {
    return res
      .status(400)
      .json("Both your sessionId and their personalId are required.");
  }

  // ensure it is really the user
  if (sessionId !== req.session.draw_session_id)
    return res.status(403).end("forbidden");

  const myPersonalId = await redisClient.get(`sessionId:${sessionId}`);
  if (myPersonalId === theirPersonalId) return res.status(403).end("forbidden");

  try {
    let userProfile = await redisClient.hGetAll(`user:${theirPersonalId}`);

    if (Object.keys(userProfile).length === 0) {
      return res.status(404).json("User not found.");
    }

    const personalIds = await redisClient.lRange(
      `following:${myPersonalId}`,
      0,
      -1
    );

    let isFollowing = false;
    for (const id of personalIds) {
      if (id == theirPersonalId) {
        isFollowing = true;
      }
    }
    if (!isFollowing)
      return res.status(400).json("You don't follow this user.");

    await redisClient.lRem(`followers:${theirPersonalId}`, 0, myPersonalId);
    await redisClient.lRem(`following:${myPersonalId}`, 0, theirPersonalId);
    await redisClient.hIncrBy(`user:${myPersonalId}`, "following", -1);
    await redisClient.hIncrBy(`user:${theirPersonalId}`, "followers", -1);

    userProfile.followers--;
    userProfile.isFollowing = false;

    // return the unfollowed user's profile
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json("Failed to unfollow user.");
  }
});

// app.listen(PORT, (err) => {
//   if (err) console.log(err);
//   console.log(`Server running on http://localhost:${PORT}`);
// });

// if (process.env.COOKIE_SECURE === "true") {
//   https.createServer(app).listen(PORT, function (err) {
//     if (err) console.log(err);
//     else console.log(`HTTP server on http://localhost:${PORT}`);
//   });
// } else {

const server = http.createServer(app).listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log(`HTTP server on http://localhost:${PORT}`);
});
// }
