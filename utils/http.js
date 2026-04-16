const sendSuccess = (res, { status = 200, message, data, meta } = {}) => {
  const payload = { ok: true };

  if (message) {
    payload.message = message;
  }

  if (data !== undefined) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(payload, data);
    } else {
      payload.data = data;
    }
  }

  if (meta) {
    payload.meta = meta;
  }

  return res.status(status).json(payload);
};

const sendError = (
  res,
  { status = 500, code = 'INTERNAL_SERVER_ERROR', message = 'Internal server error.', details, extra } = {}
) => {
  const payload = {
    ok: false,
    error: message,
    code
  };

  if (details !== undefined) {
    payload.details = details;
  }

  if (extra && typeof extra === 'object') {
    Object.assign(payload, extra);
  }

  return res.status(status).json(payload);
};

module.exports = {
  sendSuccess,
  sendError
};
