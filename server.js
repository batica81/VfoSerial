const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const isWin = process.platform === 'win32'
const Tail = require('tail-file');
const mytail = new Tail("/home/voja/.local/share/WSJT-X/test.txt")

const baudRate = 115200
let SerialPortNumber

if (!isWin) {
// Linux:
// var SerialPortNumber = "/dev/ttyUSB0";
  SerialPortNumber = '/dev/ttyACM0'
} else {
// Windows:
  SerialPortNumber = 'COM13'
}

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
    doOnPost()
  })
})


let counter = 0;

function doOnPost () {
/// local app handling

  let now = new Date()
  const { spawn } = require('child_process')

  // const ls = spawn("ls", ["-la"]);

  const ls = spawn('./gen_ft8', ["'cq de yu4hak'", '0.wav'])

  let res;
  ls.stdout.on('data', data => {
    // console.log(`stdout: ${data}`)
    // console.log(data)
    counter++;
    // console.log('msg data is: ', data.toString().split(' ')[2], now)
        let dt = data.toString().split('\n')[1].split(' ')[2];
    console.log(dt)
        console.log('aa', counter)

    io.emit('chat message', dt)

  })

  ls.stderr.on('data', data => {
    console.log(`stderr: ${data}`)
  })

  ls.on('error', (error) => {
    console.log(`error: ${error.message}`)
  })

  ls.on('close', code => {
    // console.log(`child process exited with code ${code}`)
  })
}

function parseAllTxt() {



}

mytail.on('line', line => {
  console.log(line)
  io.emit('chat message', line )
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

// parser.on('data', console.log);
parser.on('data', function (data) {
  io.emit('chat message', data)
  // console.log(data)
})
