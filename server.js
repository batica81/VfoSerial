const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const isWin = process.platform === 'win32'
const Tail = require('tail-file')
const { spawn, execSync } = require('child_process')
require('dotenv').config()

app.use(express.static('public'))
app.use(express.json())

const appPort = 3001
const baudRate = 115200
const callsign = 'YU4HAK'
let mytail
let SerialPortNumber

if (isWin) {
  // Windows:
  SerialPortNumber = process.env.WIN_SERIAL_PORT
  mytail = new Tail(process.env.WIN_ALL_PATH)
  // mytail = new Tail("/Users/Voja/AppData/Local/WSJT-X/test.txt")
} else {
  // Linux:
  SerialPortNumber = process.env.LIN_SERIAL_PORT
  mytail = new Tail(process.env.LIN_ALL_PATH)
  // mytail = new Tail("/home/voja/.local/share/WSJT-X/test.txt")
}

app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: __dirname })
})

app.post('/getcodes', (req, res) => {
  const resText = giveCode('FT8', req.body.textMessage).toString()
  const resObject = {}
  resObject.calculated = resText
  res.send(JSON.stringify(resObject))
})

http.listen(appPort, () => {
  console.log('listening on http://localhost:' + appPort)
})

io.on('connection', (socket) => {
  socket.on('socketMessage', (msg) => {
    port.write(msg + '\n', function (err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
    })
    io.emit('socketMessage', msg)
  })
})

function giveCode (protocol, textMessage) {
  let parsedString
  if (isWin) {
    // Windows:
    const stdout = execSync('ft8code.exe "' + textMessage + '"')
    parsedString = stdout.toString().trim().split('Sync')[3].replace(/\s+/g, '').trim()
  } else {
    // Linux:
    const stdout = execSync('./gen_ft8 "' + textMessage + '"' + " 01.wav | grep FSK | cut -d' ' -f3")
    parsedString = stdout.toString().trim()
  }
  return parsedString
}

mytail.on('line', line => {
  const lineArray = line.split(' ').filter(word => word !== '')
  const protocol = lineArray[3]
  const messageArray = [lineArray[7], lineArray[8], lineArray[9]]
  const messageString = messageArray.join(' ').trim()
  console.log('message: ', messageString)

  if (lineArray[8] === callsign) {
    const calculatedLine = giveCode(protocol, messageString)
    console.log(calculatedLine)
    io.emit('socketMessage', calculatedLine)

    port.write('8,' + calculatedLine + '\n', function (err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
    })
  }
})

mytail.start()

/// ////////serial

const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline

var port = new SerialPort(SerialPortNumber, {
  baudRate: baudRate
},
function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
})

const parser = new Readline()

port.pipe(parser)

parser.on('data', function (data) {
  io.emit('socketMessage', data)
})
