export function getSessionId() {
  // https://stackoverflow.com/a/21125098
  var match = document.cookie.match(new RegExp("(^| )session_id=([^;]+)"));
  if (match) return match[2];
}

async function handleResponse(res) {
  if (res.status != 200) {
    const err = await res.json();
    return { err: err };
  }
  const s = await res.json();
  return s;
}

export function ping() {
  console.log("ping...");
  fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/ping`, { method: "GET" })
    .then(handleResponse)
    .then(
      (res) => {
        console.log(`received response from PING: ${res}`);
      },
      (err) => {
        console.error(`received error from PING: ${err}`);
      }
    );
}

export async function accountSignupOrSignin(action, email, password) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountGoogleSignin(credential) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/google-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credential: credential }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountLogout() {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  }).then(handleResponse);
}

export async function accountFetchProfile(personalId = null) {
  return fetch(
    `${process.env.NEXT_PUBLIC_BACKEND}/api/get-profile?${new URLSearchParams({
      sessionId: getSessionId(),
      personalId: personalId,
    })}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  ).then(handleResponse);
}

export async function accountUsernameSubmit(newUsername) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/update-username`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId: getSessionId(),
      username: newUsername,
    }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountFollow(followPersonalId) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/api/follow`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId: getSessionId(),
      theirPersonalId: followPersonalId,
    }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountCreateGame(hostId) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/create-game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), hostId }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountJoinGame(hostId) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/join-game/${hostId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId() }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountDeleteGame(hostId) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND}/delete-game/${hostId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId() }),
    credentials: "include",
  }).then(handleResponse);
}

export async function accountGameGetUsernames(hostId) {
  return fetch(
    `${process.env.NEXT_PUBLIC_BACKEND}/game-usernames?${new URLSearchParams({
      hostId: hostId,
      sessionId: getSessionId(),
    })}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  ).then(handleResponse);
}
