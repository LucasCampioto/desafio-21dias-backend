const express = require('express')
const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')
const { generateEvolutionReport } = require('../services/agentsClient')
const { getEvolutionChartData } = require('../services/metricsService')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

router.get('/charts', async (req, res, next) => {
  try {
    const campaigns = await getEvolutionChartData(req.userId)
    res.json({ campaigns })
  } catch (err) {
    next(err)
  }
})

router.get('/insights', async (req, res, next) => {
  try {
    const db = getDb()
    const cached = await db.collection('evolution_reports').findOne({
      userId: new ObjectId(req.userId),
    })

    if (cached?.generatedAt) {
      const age = Date.now() - new Date(cached.generatedAt).getTime()
      if (age < CACHE_TTL_MS) {
        return res.json(cached.report)
      }
    }

    const response = await generateEvolutionReport(req.userId)
    const report = response?.report ?? response

    await db.collection('evolution_reports').updateOne(
      { userId: new ObjectId(req.userId) },
      {
        $set: {
          userId: new ObjectId(req.userId),
          report,
          generatedAt: new Date(),
        },
      },
      { upsert: true }
    )

    res.json(report)
  } catch (err) {
    next(err)
  }
})

module.exports = router
