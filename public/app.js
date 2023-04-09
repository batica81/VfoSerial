let oscillator
let isContinuous = false
let statusLines = 500
let currentFrequency = 0
let wsprCounter = 1
let swrData = []
let timeout
let rx = true

const bandPlan = [
  { bandName: 'snd', bandStart: 500, bandStop: 5000 },
  { bandName: '160m', bandStart: 1810000, bandStop: 2000000 },
  { bandName: '80m', bandStart: 3500000, bandStop: 3890000 },
  { bandName: '40m', bandStart: 7000000, bandStop: 7200000 },
  { bandName: '20m', bandStart: 14000000, bandStop: 14350000 },
  { bandName: '15m', bandStart: 21000000, bandStop: 21450000 },
  { bandName: '10m', bandStart: 28000000, bandStop: 29700000 },
  { bandName: '2m', bandStart: 144000000, bandStop: 146000000 },
  { bandName: '07m', bandStart: 432000000, bandStop: 438000000 }
]

// Chart for swr
const swrChart = new Chart(document.getElementById('line-chart'), {
  type: 'line',
  data: {
    labels: [1500, 1600, 1700, 1750, 1800, 1850, 1900, 1950, 1999, 2050],
    datasets: [{
      data: [86, 114, 106, 106, 107, 111, 133, 221, 783, 2478],
      label: 'SWR',
      borderColor: '#3e95cd',
      fill: false
    }
    ]
  },
  options: {
    title: {
      display: true,
      text: 'SWR on the selected band'
    },
    scales: {
      // xAxis: {
      //   // The axis for this scale is determined from the first letter of the id as `'x'`
      //   // It is recommended to specify `position` and / or `axis` explicitly.
      //   type: 'time',
      // },
      y: {
        // suggestedMin: 1,
        limit: 10,
        step: 1
      }
    }
  }
})

// 7 segment display
const display = new SegmentDisplay('display')
display.pattern = '###.###.###'
display.displayAngle = 10
display.digitHeight = 20
display.digitWidth = 12
display.digitDistance = 2.5
display.segmentWidth = 2.5
display.segmentDistance = 0.5
display.segmentCount = 7
display.cornerType = 3
display.colorOn = '#e95d0f'
display.colorOff = '#4b1e05'
display.draw()
display.setValue('000.000.000')

// create web audio api context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
const socket = io()

const setFrequencyButton = document.querySelector('.setFrequencyButton')
const currentFrequencyInput = document.querySelector('.currentFrequencyInput')
const continuousTX = document.querySelector('#continuousTX')
const currentFreq = document.querySelector('.currentFreq')
const lowFreqLimit = document.querySelector('.lowFreqLimit')
const highFreqLimit = document.querySelector('.highFreqLimit')
const sweepStep = document.querySelector('.sweepStep')
const bandSweepButton = document.querySelector('.bandSweepButton')
const cwArea = document.querySelector('.cwArea')
const rxButton = document.querySelector('.rxToggle')
const stopButon = document.querySelector('.stopButon')
const sendMessageButton = document.querySelector('.sendMessageButton')
const sendWsprButton = document.querySelector('.sendWsprButton')
const timeButton = document.querySelector('.timeButton')
const freqSlider = document.querySelector('.freqSlider')
const statusLog = document.querySelector('#messages')
const clearStatusLog = document.querySelector('.clearStatusLog')
const morseButton = document.querySelector('.morseButton')
const morseMessage = document.querySelector('.morseMessage')
const powerInput = document.querySelectorAll('input[name=power]')

// autoNumeric with the defaults options
new AutoNumeric(currentFrequencyInput, {
  decimalCharacter: ',',
  digitGroupSeparator: '.',
  allowDecimalPadding: false
})
new AutoNumeric(lowFreqLimit, {
  decimalCharacter: ',',
  digitGroupSeparator: '.',
  allowDecimalPadding: false
})
new AutoNumeric(highFreqLimit, {
  decimalCharacter: ',',
  digitGroupSeparator: '.',
  allowDecimalPadding: false
})
new AutoNumeric(sweepStep, {
  decimalCharacter: ',',
  digitGroupSeparator: '.',
  allowDecimalPadding: false
})

function sendMorseMessage () {
  let message = morseMessage.value
  MorseJs.Play(message, 20, 800);

  // todo: add wpm selector
  // todo: connect to actual keyer
}

function timeSynch () {
  let date = new Date()
  const localOffset = date.getTimezoneOffset() * 60000
  const localTime = date.getTime()
  date = localTime - localOffset
  return Math.floor(date / 1000)
}

function cwPlay () {
  socket.emit('socketMessage', '2,' + currentFrequency)

  // create Oscillator node for sidetone
  if (currentFrequency < 96000) {
    oscillator = audioCtx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(currentFrequency, audioCtx.currentTime) // value in hertz
    oscillator.connect(audioCtx.destination)
    oscillator.start()
  } else {
    console.log('Sidetone only up to 96khz')
    writeMessageToScreen('Sidetone only up to 96khz')
  }
}

function cwStop () {
  if (!isContinuous) {
    socket.emit('socketMessage', '2,' + 0)
  }
  if (oscillator && !isContinuous) {
    oscillator.stop()
  }
}
function rxToggle () {
  if (rx) {
    socket.emit('socketMessage', '9,' + currentFrequency)
    rx = false;
    console.log('RX enabled on: ' + currentFrequency)
  } else {
    socket.emit('socketMessage', '2,' + 0)
    rx = true
    console.log('RX disabled')
  }
}

function writeMessageToScreen (msg) {
  $('#messages').append($('<li>').text(msg)).scrollTop($('#messages')[0].scrollHeight)
  statusLines--
  if (statusLines === 0) {
    statusLines = 500
    statusLog.innerHTML = ''
  }
  if (msg.includes(':')) {
    const tmpObj = {}
    tmpObj.freq = parseInt(msg.split(':')[0])
    tmpObj.swr = parseFloat(msg.split(':')[1].trim())
    swrData.push(tmpObj)
  }
}

function waitEvenMinute () {
  clearTimeout(timeout)
  let timeToEven = 0
  const d = new Date()
  const m = d.getMinutes()
  const s = d.getSeconds()

  if (m % 2 === 1) {
    timeToEven = 60 - s
  } else {
    timeToEven = 120 - s
  }

  console.log('timeToEven: ', timeToEven)
  writeMessageToScreen('timeToEven ' + timeToEven.toString())

  timeout = setTimeout(function () {
    console.log('sending wspr')
    writeMessageToScreen('Sending WSPR')

    socket.emit('socketMessage', '7,' + 'wspr')

    if (wsprCounter > 0) {
      waitEvenMinute()
      wsprCounter--
    }
  }, timeToEven * 1000)
}

function waitQuarterMinute (message) {
  clearTimeout(timeout)
  let timeToEven = 0
  const d = new Date()
  // let m = d.getMinutes();
  const s = d.getSeconds()

  if (s % 15 === s) {
    timeToEven = 15 - s
  } else {
    timeToEven = 15 - (s % 15)
  }

  console.log('timeToEven: ', timeToEven)
  writeMessageToScreen('timeToEven ' + timeToEven.toString())

  timeout = setTimeout(function () {
    console.log('Sending message')
    writeMessageToScreen('Sending FT8 message')
    socket.emit('socketMessage', '8,' + message)
  }, timeToEven * 1000)
}

function logKey (e) {
  if (e.code === 'ControlRight') {
    cwPlay()
  }
}

function logKeyUp (e) {
  if (e.code === 'ControlRight') {
    cwStop()
  }
}

function getCodes (textMessage) {
  //   fetch('http://192.168.1.20:3070/', {  // external api
  fetch('http://localhost:3001/getcodes', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ textMessage: textMessage })
  })
    .then(response => response.json())
    .then(data => {
      console.log(data)
      waitQuarterMinute(data.calculated)
    })
}

function doBandSweep (bandName) {
  swrData = []
  const l = bandPlan.find(b => { return b.bandName === bandName })
  const scanStep = Math.trunc((l.bandStop - l.bandStart) / 101)
  const interval = 60 // how much time should the delay between two iterations be (in milliseconds)?
  let promise = Promise.resolve()

  for (let i = l.bandStart; i <= l.bandStop; i = i + scanStep) {
    promise = promise.then(function () {
      console.log(i)
      currentFreq.innerHTML = i
      updateFreq(i.toString())
      socket.emit('socketMessage', '2,' + i)

      return new Promise(function (resolve) {
        setTimeout(resolve, interval)
      })
    })
  }

  promise.then(function () {
    console.log('Loop finished.')
    socket.emit('socketMessage', '2,' + 0)
    if (oscillator) {
      oscillator.stop()
    }
    const freqs = Object.keys(swrData).map(key => (swrData[key].freq))
    const swr = Object.keys(swrData).map(key => (swrData[key].swr))
    swrChart.data.labels = freqs
    swrChart.options.title.text = 'SWR on the ' + bandName + ' band'
    swrChart.data.datasets[0].data = swr
    swrChart.update()
    console.log('STOP sent')
    writeMessageToScreen('STOP Sent')
  })
}

function updateFreq (freq) {
  const tmpFreq = ('000000000' + freq)
  let tmpFreq2 = tmpFreq.substring(tmpFreq.length - 11)

  if (!tmpFreq2.includes('.')) {
    const tmpFreq3 = tmpFreq.substring(tmpFreq.length - 9)
    const a = tmpFreq3.split('')
    a.splice(-3, 0, '.')
    a.splice(-7, 0, '.')
    tmpFreq2 = a.join('')
  }
  display.setValue(tmpFreq2)
}

socket.on('socketMessage', function (msg) {
  writeMessageToScreen(msg)
})

document.addEventListener('keydown', logKey)

document.addEventListener('keyup', logKeyUp)

setFrequencyButton.addEventListener('click', function () {
  if (MorseJs.empty) {
    morseInit()
  }
  currentFreq.innerHTML = currentFrequencyInput.value.toString()
  updateFreq(currentFrequencyInput.value.toString())
  currentFrequency = currentFrequencyInput.value.toString().replaceAll('.', '')
  socket.emit('socketMessage', '6,' + currentFrequency)
  console.log(currentFrequency)
})

bandSweepButton.addEventListener('click', function () {
  doBandSweep(document.querySelector('input[name="band"]:checked').value)
})

freqSlider.addEventListener('input', function () {
  this.min = lowFreqLimit.value.toString().replaceAll('.', '')
  this.max = highFreqLimit.value.toString().replaceAll('.', '')
  this.step = sweepStep.value.toString().replaceAll('.', '')

  currentFreq.innerHTML = this.value
  updateFreq(this.value.toString())
  socket.emit('socketMessage', '2,' + this.value)
})
freqSlider.addEventListener('mouseup', function () {
  socket.emit('socketMessage', '2,' + 0)
  if (oscillator) {
    oscillator.stop()
  }
  console.log('STOP sent')
  writeMessageToScreen('STOP Sent')
  const freqs = Object.keys(swrData).map(key => (swrData[key].freq))
  const swr = Object.keys(swrData).map(key => (swrData[key].swr))
  swrChart.data.labels = freqs
  swrChart.options.title.text = 'SWR on the sweeped band'
  swrChart.data.datasets[0].data = swr
  swrChart.update()
})
freqSlider.addEventListener('mousedown', function () {
  swrData = []
})

stopButon.addEventListener('click', function () {
  currentFreq.innerHTML = '0'
  updateFreq('000.000.000')
  socket.emit('socketMessage', '2,' + 0)
  if (oscillator) {
    oscillator.stop()
  }
  console.log('STOP sent')
  writeMessageToScreen('STOP Sent')
})

sendMessageButton.addEventListener('click', function () {
  const message = document.querySelector('.messageTextInput').value.toUpperCase()
  getCodes(message)
})

sendWsprButton.addEventListener('click', function () {
  wsprCounter = parseInt(document.querySelector('.wsprCyclesCount').value)
  waitEvenMinute()
})

morseButton.addEventListener('click', sendMorseMessage)

rxButton.addEventListener('click', rxToggle)

cwArea.addEventListener('mousedown', cwPlay)

cwArea.addEventListener('mouseup', cwStop)

clearStatusLog.addEventListener('click', (e) => statusLog.innerHTML = '')

continuousTX.addEventListener('change', function () {
  isContinuous = !isContinuous
})

timeButton.addEventListener('click', function () {
  socket.emit('socketMessage', '4,' + timeSynch())
  console.log('timeSynch sent')
  writeMessageToScreen('timeSynch sent')
})

powerInput.forEach(rb => {
  rb.addEventListener('change', function () {
    socket.emit('socketMessage', '3,' + this.value)
  })
})
