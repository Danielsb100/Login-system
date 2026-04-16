const env = require('./env');

const resolveLocalMultiplayerUrl = (req) => {
  const hostname = req.hostname || '';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:3001`;
  }

  return '';
};

const buildClientRuntimeConfig = (req) => ({
  apiBaseUrl: env.public.apiBaseUrl,
  multiplayerUrl: env.public.multiplayerUrl || resolveLocalMultiplayerUrl(req),
  upload: {
    maxFileSizeMb: env.upload.maxFileSizeMb
  },
  auth: {
    tokenExpiresIn: env.auth.tokenExpiresIn
  }
});

module.exports = {
  buildClientRuntimeConfig
};
