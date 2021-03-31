const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const isWin = process.platform === 'win32'

if (!isWin) {
// Linux:
// var SerialPortNumber = "/dev/ttyUSB0";
  var SerialPortNumber = '/dev/ttyACM0'
} else {
// Windows:
  var SerialPortNumber = 'COM13'
}

const baudRate = 115200

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: __dirname })
})

http.listen(3000, () => {
  console.log('listening on http://localhost:3000')
})

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    port.write(msg + '\n', function (err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
      // console.log('message written')
    })

    // console.log('message: ' + msg);
    io.emit('chat message', msg)
  })
})

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

// parser.on('data', console.log);
parser.on('data', function (data) {
  io.emit('chat message', data)
  // console.log(data)
})
