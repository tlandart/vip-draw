const express = require("express");
const { createClient } = require("redis");
const bodyParser = require("body-parser");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");
const session = require("express-session");
const bcrypt = require('bcrypt');

const app = express();
const PORT = 4000;

const CLIENT_ID =
  "821267595423-77gcpdmldn8t63e2ck2jntncld0k7uv9.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND);
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(
  session({
    secret: "vip",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

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
    return res.status(400).json({ message: "Email and password are required." });
  }
  
  try {
    const existingUser = await redisClient.hGetAll(`user:${email}`);
    if (Object.keys(existingUser).length !== 0) {
      return res.status(400).json({ message: "Email already in use." });
    }
    
    const defaultUsername = `Drawer#${Math.floor(Math.random() * 10000)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    await redisClient.hSet(`user:${email}`, {
      email,
      password: hashedPassword,
      username: defaultUsername,
    });

    console.log("User created:", { email });
    console.log("Name:", { defaultUsername });
    res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const existingUser = await redisClient.hGetAll(`user:${email}`);

    if (Object.keys(existingUser).length === 0) {
      return res.status(400).json({ message: "User not found." });
    }

    const match = await bcrypt.compare(password, existingUser.password);

    if (!match) {
      return res.status(400).json({ message: "Incorrect password." });
    }

    console.log("User signed in:", { email });
    res.status(200).json({ message: "Signed in successfully." });
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
    let user = await redisClient.hGetAll(`user:${email}`);

    if (Object.keys(user).length === 0) {
      const defaultUsername = `Drawer#${Math.floor(Math.random() * 10000)}`;
      await redisClient.hSet(`user:${email}`, {
        email,
        username: defaultUsername,
      });
      user = { email, username: defaultUsername };
      console.log(`New user created for ${email} with username ${defaultUsername}.`);
    } else {
      console.log(`User ${email} already exists.`);
    }

    res.send({ message: "User authenticated successfully.", user });
  } catch (err) {
    console.error("Error verifying Google ID token:", err);
    res.status(500).send({ message: "Failed to authenticate user." });
  }
});

app.get("/api/get-profile/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const userProfile = await redisClient.hGetAll(`user:${email}`);

    if (Object.keys(userProfile).length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

app.post("/api/update-username", async (req, res) => {
  const { email, username } = req.body;

  if (!email || !username) {
    return res.status(400).json({ message: "Email and username are required." });
  }

  try {
    const user = await redisClient.hGetAll(`user:${email}`);

    if (Object.keys(user).length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    
    await redisClient.hSet(`user:${email}`, { username });
    res.status(200).json({ message: "Username updated successfully." });
  } catch (error) {
    console.error("Error updating username:", error);
    res.status(500).json({ message: "Failed to update username." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});

app.listen(PORT, (err) => {
  if (err) console.log(err);
  console.log(`Server running on http://localhost:${PORT}`);
});
