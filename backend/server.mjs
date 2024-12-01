import express from "express";
import { createClient } from "redis";
import bodyParser from "body-parser";
import { OAuth2Client } from "google-auth-library";
import session from "express-session";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { createServer } from "http";
import { parse, serialize } from "cookie";

const app = express();
const PORT = 4000;

const CLIENT_ID =
  "821267595423-77gcpdmldn8t63e2ck2jntncld0k7uv9.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND);
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", ["Content-Type", "Authorization"]);
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(
  session({
    // secret: process.env.SECRET_KEY,
    secret: "dfsdf",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
    },
  })
);

const isAuthenticated = function (req, res, next) {
  console.log("req.session.session_id is", req.session.session_id);
  if (!req.session.session_id) return res.status(401).end("access denied");
  next();
};

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

app.get("/get-game/:hostId", async (req, res) => {
  const { hostId } = req.params;
  console.log(`Attempting to retrieve Host ID: ${hostId}`);

  try {
    const reply = await redisClient.get(hostId);

    if (reply) {
      console.log(`Host ID found: ${hostId} with status ${reply}`);
      res
        .status(200)
        .send({ message: `Host ID ${hostId} is active.`, status: reply });
    } else {
      console.error(`Host ID not found in Redis: ${hostId}`);
      res.status(404).send({ message: `Host ID ${hostId} not found.` });
    }
  } catch (err) {
    console.error("Error retrieving Host ID:", err);
    res.status(500).send({ message: "Failed to retrieve Host ID." });
  }
});

app.post("/create-host", async (req, res) => {
  const { hostId } = req.body;

  if (!hostId) {
    return res.status(400).send({ message: "Host ID is required." });
  }

  try {
    await redisClient.set(hostId, "active", { EX: 3600 });
    console.log(`Host ID ${hostId} stored successfully.`);
    res.send({ message: `Host ID ${hostId} created successfully.` });
  } catch (err) {
    console.error("Error storing Host ID:", err);
    res.status(500).send({ message: "Failed to store Host ID." });
  }
});

app.delete("/delete-game/:hostId", (req, res) => {
  const { hostId } = req.params;
  console.log(`Attempting to delete Host ID: ${hostId}`);

  redisClient.del(hostId, (err, reply) => {
    if (err) {
      console.error("Error deleting Host ID from Redis:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (reply === 1) {
      console.log(`Successfully deleted Host ID: ${hostId}`);
      res.status(200).send("Host ID deleted");
    } else {
      console.error(`Host ID not found in Redis: ${hostId}`);
      res.status(404).send("Host ID not found");
    }
  });
});

app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const existingUser = await redisClient.get(`email:${email}`);
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use." });
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
    req.session.session_id = sessionId;
    res.setHeader(
      "Set-Cookie",
      serialize("session_id", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
        credentials: true,
      })
    );
    res.status(201).json(user);
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const personalId = await redisClient.get(`email:${email}`);
    const existingUser = await redisClient.hGetAll(`user:${personalId}`);

    if (!existingUser || Object.keys(existingUser).length === 0) {
      return res.status(400).json({ message: "User not found." });
    }

    const match = await bcrypt.compare(password, existingUser.hash);

    if (!match) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    // start a session
    req.session.session_id = existingUser.sessionId;
    res.setHeader(
      "Set-Cookie",
      serialize("session_id", existingUser.sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
      })
    );
    res.status(200).json(existingUser);
  } catch (error) {
    console.error("Error during sign-in:", error);
    res.status(500).json({ message: "Failed to sign in" });
  }
});

app.post("/api/google-login", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).send({ message: "Credential is required." });
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
    req.session.session_id = sub;
    res.setHeader(
      "Set-Cookie",
      serialize("session_id", sub, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week in number of seconds
      })
    );
    res.status(201).json(user);
  } catch (err) {
    console.error("Error verifying Google ID token:", err);
    res.status(500).send({ message: "Failed to authenticate user." });
  }
});

app.post("/api/logout", isAuthenticated, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.clearCookie("session_id");
    res.status(200).json({ message: "Logged out successfully" });
  });
});

app.get("/api/get-profile/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  const personalId = await redisClient.get(`sessionId:${sessionId}`);

  try {
    const userProfile = await redisClient.hGetAll(`user:${personalId}`);

    if (Object.keys(userProfile).length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

// app.get("/api/get-profile/:personalId", async (req, res) => {
//   const { personalId } = req.params;

//   try {
//     const userProfile = await redisClient.hGetAll(`user:${personalId}`);

//     if (Object.keys(userProfile).length === 0) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     res.status(200).json(userProfile);
//   } catch (error) {
//     console.error("Error fetching user profile:", error);
//     res.status(500).json({ message: "Failed to fetch user profile" });
//   }
// });

// app.get("/api/get-follow-counts/:personalId", async (req, res) => {
//   const { personalId } = req.params;

//   try {
//     const user = await redisClient.hGetAll(`user:${personalId}`);

//     if (Object.keys(user).length === 0) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     const followers = user.followers || 0;
//     const following = user.following || 0;

//     res.status(200).json({ followers, following });
//   } catch (error) {
//     console.error("Error fetching user follow counts:", error);
//     res.status(500).json({ message: "Failed to fetch follow counts" });
//   }
// });

app.post("/api/update-username", isAuthenticated, async (req, res) => {
  const { sessionId, username } = req.body;

  if (!sessionId || !username) {
    return res
      .status(400)
      .json({ message: "personalId and username are required." });
  }

  // ensure it is really the user
  if (sessionId !== req.session.session_id)
    return res.status(403).end("forbidden");

  const personalId = await redisClient.get(`sessionId:${sessionId}`);

  try {
    let user = await redisClient.hGetAll(`user:${personalId}`);

    if (Object.keys(user).length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    await redisClient.hSet(`user:${personalId}`, { username });
    user.username = username;
    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ message: "Failed to update username." });
  }
});

app.post("/api/follow", isAuthenticated, async (req, res) => {
  const { sessionId, theirPersonalId } = req.body;

  // ensure it is really the user
  if (sessionId !== req.session.session_id)
    return res.status(403).end("forbidden");

  const myPersonalId = await redisClient.get(`sessionId:${sessionId}`);

  if (!myPersonalId || !theirPersonalId) {
    return res.status(400).json({
      message: "Both your personalId and their personalId are required.",
    });
  }

  try {
    let follower = await redisClient.hGetAll(`user:${myPersonalId}`);
    const following = await redisClient.hGetAll(`user:${theirPersonalId}`);

    if (
      Object.keys(follower).length === 0 ||
      Object.keys(following).length === 0
    ) {
      return res.status(404).json({ message: "One or both users not found." });
    }

    const followKey = `following:${myPersonalId}`;
    const alreadyFollowing = await redisClient.sIsMember(
      followKey,
      theirPersonalId
    );

    if (alreadyFollowing) {
      return res
        .status(400)
        .json({ message: "You are already following this user." });
    }

    await redisClient
      .multi()
      .sAdd(followKey, theirPersonalId)
      .sAdd(`followers:${theirPersonalId}`, myPersonalId)
      .hIncrBy(`user:${myPersonalId}`, "following", 1)
      .hIncrBy(`user:${theirPersonalId}`, "followers", 1)
      .exec();

    follower.following++;

    res.status(200).json(follower);
  } catch (error) {
    console.error("Error following user:", error);
    res.status(500).json({ message: "Failed to follow user." });
  }
});

app.post("/api/unfollow", isAuthenticated, async (req, res) => {
  const { sessionId, theirPersonalId } = req.body;

  if (!sessionId || !theirPersonalId) {
    return res.status(400).json({
      message: "Both your sessionId and their personalId are required.",
    });
  }

  // ensure it is really the user
  if (sessionId !== req.session.session_id)
    return res.status(403).end("forbidden");

  const myPersonalId = await redisClient.get(`sessionId:${sessionId}`);

  if (myPersonalId !== req.session.personalId)
    return res.status(403).end("forbidden");

  try {
    const follower = await redisClient.hGetAll(`user:${myPersonalId}`);
    const following = await redisClient.hGetAll(`user:${theirPersonalId}`);

    if (
      Object.keys(follower).length === 0 ||
      Object.keys(following).length === 0
    ) {
      return res.status(404).json({ message: "One or both users not found." });
    }

    const followKey = `following:${myPersonalId}`;
    const alreadyFollowing = await redisClient.sIsMember(
      followKey,
      theirPersonalId
    );

    if (!alreadyFollowing) {
      return res
        .status(400)
        .json({ message: "You are not following this user." });
    }

    await redisClient
      .multi()
      .sRem(followKey, theirPersonalId)
      .sRem(`followers:${theirPersonalId}`, myPersonalId)
      .hIncrBy(`user:${myPersonalId}`, "following", -1)
      .hIncrBy(`user:${theirPersonalId}`, "followers", -1)
      .exec();

    res
      .status(200)
      .json({ message: `${myPersonalId} has unfollowed ${theirPersonalId}.` });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    res.status(500).json({ message: "Failed to unfollow user." });
  }
});

// app.listen(PORT, (err) => {
//   if (err) console.log(err);
//   console.log(`Server running on http://localhost:${PORT}`);
// });

createServer(app).listen(PORT, function (err) {
  if (err) console.log(err);
  else console.log(`HTTP server on http://localhost:${PORT}`);
});
