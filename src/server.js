const config = require('./config')
const { createApp } = require('./app')

const app = createApp()

app.listen(config.port, () => {
  console.log(`Backend rodando em http://localhost:${config.port}`)
})
