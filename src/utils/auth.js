const CLIENT_ID = "3d9d2dc21c6046049c169a6fc69b9291";
const REDIRECT_URI =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:3000"
    : window.location.origin;
const SCOPES = [
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-private",
  "user-read-private",
].join(" ");

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const generateCodeVerifier = () => {
  return generateRandomString(64);
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const generateCodeChallenge = async (verifier) => {
  const hashed = await sha256(verifier);
  return base64encode(hashed);
};

export const authenticateSpotify = async () => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  console.log({ codeVerifier, codeChallenge })

  localStorage.setItem("code_verifier", codeVerifier);

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
  window.location.href = authUrl;
};

export const exchangeCodeForToken = async (code, codeVerifier) => {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      return data.access_token;
    } else {
      console.error("Token exchange failed:", data);
      return null;
    }
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return null;
  }
};

export const handleAuthCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  const error = urlParams.get("error");

  if (error) {
    console.error("Authorization error:", error);
    window.history.replaceState({}, document.title, window.location.pathname);
    return { error };
  }

  if (code) {
    const codeVerifier = localStorage.getItem("code_verifier");
    if (codeVerifier) {
      const accessToken = await exchangeCodeForToken(code, codeVerifier);
      localStorage.removeItem("code_verifier");
      window.history.replaceState({}, document.title, window.location.pathname);
      return { accessToken };
    }
  }

  return {};
};

