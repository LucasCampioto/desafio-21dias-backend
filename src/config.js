require('dotenv').config()

const config = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/quantum-journal',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  agentsUrl: process.env.AGENTS_URL || 'http://localhost:8000',
  agentsApiKey: process.env.AGENTS_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
}

module.exports = config
