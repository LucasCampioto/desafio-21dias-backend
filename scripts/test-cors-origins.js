const { isOriginAllowed, normalizeOrigin, parseCorsOrigins } = require('../src/cors')

const allowedOrigins = parseCorsOrigins(
  'https://desafio-21dias.vercel.app,https://*.vercel.app,http://localhost:5174',
)

const cases = [
  { origin: 'https://desafio-21dias.vercel.app', allowPreviews: false, expected: true },
  { origin: 'https://desafio-21dias.vercel.app/', allowPreviews: false, expected: true },
  { origin: 'https://desafio-21dias-git-main-user.vercel.app', allowPreviews: false, expected: true },
  { origin: 'https://desafio-21dias-git-main-user.vercel.app', allowPreviews: true, expected: true },
  { origin: 'http://localhost:5174', allowPreviews: false, expected: true },
  { origin: 'https://evil.com', allowPreviews: false, expected: false },
  { origin: undefined, allowPreviews: false, expected: true },
]

let failed = 0

for (const { origin, allowPreviews, expected } of cases) {
  const result = isOriginAllowed(origin, allowedOrigins, allowPreviews)
  const label = origin ?? '(no origin)'
  if (result !== expected) {
    console.error(`FAIL: ${label} (previews=${allowPreviews}) => ${result}, expected ${expected}`)
    failed += 1
  } else {
    console.log(`OK: ${label} (previews=${allowPreviews}) => ${result}`)
  }
}

console.log(`\nnormalizeOrigin trailing slash: ${normalizeOrigin('https://foo.vercel.app/')}`)

if (failed > 0) {
  process.exit(1)
}

console.log('\nAll CORS origin checks passed.')
