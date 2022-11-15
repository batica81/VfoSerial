const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const isWin = process.platform === 'win32'
const Tail = require('tail-file');
const { spawn, execSync} = require('child_process')

app.use(express.static('public'))
app.use(express.json());

const appPort = 3000;
const baudRate = 115200
const callsign = "YU4HAK"
let mytail
let SerialPortNumber

if (isWin) {
  // Windows:
  SerialPortNumber = 'COM12'
  mytail = new Tail("/Users/Voja/AppData/Local/WSJT-X/ALL.TXT")
  // mytail = new Tail("/Users/Voja/AppData/Local/WSJT-X/test.txt")
} else {
  // Linux:
  // var SerialPortNumber = "/dev/ttyUSB0";
  SerialPortNumber = '/dev/ttyACM0'
  mytail = new Tail("/home/voja/.local/share/WSJT-X/ALL.TXT")
  // mytail = new Tail("/home/voja/.local/share/WSJT-X/test.txt")
}

app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: __dirname })
})

app.post('/getcodes', (req, res) => {
  let resText = giveCode("FT8", req.body.textMessage).toString();
  let resObject = {}
  resObject.calculated = resText;
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
    parsedString = stdout.toString().trim().split('Sync')[3].replace(/\s+/g, '').trim();
  } else {
    // Linux:
    const stdout = execSync('./gen_ft8 "' + textMessage + '"' + " 01.wav | grep FSK | cut -d' ' -f3")
    parsedString = stdout.toString().trim()
  }
  return parsedString;
}

mytail.on('line', line => {
  let lineArray = line.split(" ").filter(word => word !== "");
  let protocol = lineArray[3]
  let messageArray = [lineArray[7], lineArray[8], lineArray[9]]
  let messageString = messageArray.join(" ").trim()
  console.log('message: ', messageString)

  if (lineArray[8] === callsign){
    let calculatedLine = giveCode(protocol, messageString)
    console.log(calculatedLine)
    io.emit('socketMessage', calculatedLine )

    port.write('8,'+ calculatedLine + '\n', function (err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
    })
  }
} );

mytail.start();

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
