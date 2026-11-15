// Runtime configuration.
// Bills are read by our serverless endpoint (api/read.js), which holds the Gemini key
// in a server environment variable. The page never sees the key.
export const AI_ENDPOINT = 'api/read';
