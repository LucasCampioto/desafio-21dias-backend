function normalizeOrigin(origin) {
  if (!origin) return origin
  return origin.replace(/\/+$/, '')
}

function parseCorsOrigins(corsOriginString) {
  return corsOriginString
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean)
}

function wildcardToRegex(pattern) {
  const parts = pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`^${parts.join('[^/]+')}$`, 'i')
}

function isVercelAppOrigin(origin) {
  return /^https:\/\/[^/]+\.vercel\.app$/i.test(normalizeOrigin(origin))
}

function isOriginAllowed(origin, allowedOrigins, allowVercelPreviews) {
  if (!origin) return true

  const normalized = normalizeOrigin(origin)

  if (allowVercelPreviews && isVercelAppOrigin(normalized)) {
    return true
  }

  return allowedOrigins.some((pattern) => {
    if (pattern.includes('*')) {
      return wildcardToRegex(pattern).test(normalized)
    }
    return pattern === normalized
  })
}

function buildCorsOptions(config) {
  const allowedOrigins = parseCorsOrigins(config.corsOrigin)
  const allowVercelPreviews = config.corsAllowVercelPreviews
  const isVercel = Boolean(process.env.VERCEL)

  return {
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins, allowVercelPreviews)) {
        callback(null, true)
        return
      }

      if (isVercel && origin) {
        console.warn(`[CORS] Origin rejected: ${origin}`)
      }

      callback(null, false)
    },
    credentials: true,
  }
}

function attachCorsOrigin(config) {
  const allowedOrigins = parseCorsOrigins(config.corsOrigin)
  const allowVercelPreviews = config.corsAllowVercelPreviews

  return (req, res, next) => {
    const origin = req.headers.origin
    if (origin && isOriginAllowed(origin, allowedOrigins, allowVercelPreviews)) {
      req.corsOrigin = normalizeOrigin(origin)
    }
    next()
  }
}

function applyCorsHeaders(req, res) {
  if (req.corsOrigin) {
    res.setHeader('Access-Control-Allow-Origin', req.corsOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
}

module.exports = {
  normalizeOrigin,
  parseCorsOrigins,
  isOriginAllowed,
  buildCorsOptions,
  attachCorsOrigin,
  applyCorsHeaders,
}
