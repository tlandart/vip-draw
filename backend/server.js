const express = require('express');
const { createClient } = require('redis');
const bodyParser = require('body-parser');
const cors = require('cors'); 

const app = express();
const PORT = 4000;

app.use(bodyParser.json());
app.use(cors()); 
const redisClient = createClient();

redisClient.on('connect', () => {
  console.log('Connected to Redis.');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
});

app.get('/get-game/:hostId', async (req, res) => {
  const { hostId } = req.params;
  console.log(`Attempting to retrieve Host ID: ${hostId}`);

  try {
    const reply = await redisClient.get(hostId);

    if (reply) {
      // If the hostId exists
      console.log(`Host ID found: ${hostId} with status ${reply}`);
      res.status(200).send({ message: `Host ID ${hostId} is active.`, status: reply });
    } else {
      // If hostId doesn't exist
      console.error(`Host ID not found in Redis: ${hostId}`);
      res.status(404).send({ message: `Host ID ${hostId} not found.` });
    }
  } catch (err) {
    console.error('Error retrieving Host ID:', err);
    res.status(500).send({ message: 'Failed to retrieve Host ID.' });
  }
});

app.post('/create-host', async (req, res) => {
  const { hostId } = req.body;

  if (!hostId) {
    return res.status(400).send({ message: 'Host ID is required.' });
  }

  try {
    // Store host ID 
    await redisClient.set(hostId, 'active', { EX: 3600 });  // Expires after 1 hour
    console.log(`Host ID ${hostId} stored successfully.`);
    res.send({ message: `Host ID ${hostId} created successfully.` });
  } catch (err) {
    console.error('Error storing Host ID:', err);
    res.status(500).send({ message: 'Failed to store Host ID.' });
  }
});

app.delete('/delete-game/:hostId', (req, res) => {
  const { hostId } = req.params;
  console.log(`Attempting to delete Host ID: ${hostId}`); 

  redisClient.del(hostId, (err, reply) => {
    if (err) {
      console.error("Error deleting Host ID from Redis:", err);
      return res.status(500).send('Internal Server Error');
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


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
