export const TWITTER_CLIENT_ID = import.meta.env.VITE_TWITTER_CLIENT_ID || '';
export const TWITTER_REDIRECT_URI = import.meta.env.VITE_TWITTER_REDIRECT_URI || '';

function base64urlencode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlencode(digest);
}

export async function startPkceAuth() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  sessionStorage.setItem('twitter_pkce_verifier', verifier);
  sessionStorage.setItem('twitter_pkce_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_REDIRECT_URI,
    scope: 'tweet.read users.read bookmark.read offline.access',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  window.location.href = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const verifier = sessionStorage.getItem('twitter_pkce_verifier');
  sessionStorage.removeItem('twitter_pkce_verifier');
  if (!verifier) {
    throw new Error('Missing code verifier');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_REDIRECT_URI,
    code,
    code_verifier: verifier
  });

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) {
    throw new Error('Token exchange failed');
  }

  return res.json();
}
