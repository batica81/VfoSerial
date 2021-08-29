const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
app.use(cors())
const port = 3070
const { execSync } = require('child_process')

function giveCode (textMessage) {
  const stdout = execSync('./gen_ft8 "' + textMessage + '"' + " 01.wav | grep FSK | cut -d' ' -f3")
  return stdout.toString().trim()
}

app.get('/', (req, res) => {
  res.send('send post with ascii message')
})

app.use(bodyParser.json())
app.use(function (req, res, next) {
  // if (req.body["api_key"] === apiKey) {
  const textMessage = req.body.textMessage
  // } // api key

  const result = giveCode(textMessage)

  console.log(result)

  const resObject = {}
  resObject.calculated = result

  res.send(JSON.stringify(resObject))
  next()
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
