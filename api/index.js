const serverless = require('serverless-http')
const { createApp } = require('../src/app')

let handlerPromise = null

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = createApp().then((app) => serverless(app))
  }
  return handlerPromise
}

module.exports = async (req, res) => {
  const handler = await getHandler()
  return handler(req, res)
}
