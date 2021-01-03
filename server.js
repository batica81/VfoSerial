const express = require('express');
const app = express();
let http = require('http').createServer(app);
let io = require('socket.io')(http);

let SerialPortNumber = "COM13";
// let SerialPortNumber = "/dev/ttyUSB0";

let baudRate = 115200;
// let baudRate = 57600;

app.use(express.static('public'));


app.get('/', (req, res) => {
    res.sendFile('public/index.html', { root: __dirname });
});




http.listen(3000, () => {
    console.log('listening on http://localhost:3000');
});


io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
        port.write(msg + '\n', function(err) {
            if (err) {
                return console.log('Error on write: ', err.message)
            }
            // console.log('message written')
        })

        // console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
});


///////////serial

const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
// const WriteLine = SerialPort.write('333');

const port = new SerialPort(SerialPortNumber, {
  	baudRate: baudRate
    },
    function (err) {
        if (err) {
            return console.log('Error: ', err.message);
        }
    });

const parser = new Readline();

port.pipe(parser);

// parser.on('data', console.log);
parser.on('data', function (data){

    io.emit('chat message', data);
    // console.log(data)
});




