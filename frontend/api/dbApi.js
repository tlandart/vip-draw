export async function createHost(hostId) {
  try {
    console.log("Attempting to create host with ID:", hostId);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND}/create-host`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      console.error("Server responded with error:", data.message);
      throw new Error(data.message || "Failed to create host ID.");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating host ID:", error.message);
    throw error;
  }
}

export async function deleteGame(hostId) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND}/delete-game/${hostId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      throw new Error("Failed to delete host ID.");
    }
    return await response.text();
  } catch (err) {
    console.error("Error deleting host ID:", err);
    throw err;
  }
}

export async function checkGame(hostId) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND}/get-game/${hostId}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          error: "Game ID does not exist. Please check the ID and try again.",
        };
      }
      return { error: "Failed to check game ID." };
    }

    return await response.json();
  } catch (err) {
    console.error("Error checking game ID:", err);
    return { error: err.message };
  }
}
