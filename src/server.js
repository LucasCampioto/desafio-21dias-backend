const config = require('./config')
const { createApp } = require('./app')

async function start() {
  const app = await createApp()
  app.listen(config.port, () => {
    console.log(`Backend rodando em http://localhost:${config.port}`)
  })
}

start().catch((err) => {
  console.error('Falha ao iniciar servidor:', err)
  process.exit(1)
})
