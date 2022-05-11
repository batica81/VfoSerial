let oscillator
let isContinous = false

let statusLines = 500
let currentFrequency = 0

let wsprCounter = 1

const swrData = []

window.addEventListener("load", startup);

function startup() {

  //jogdial

  // var dial = JogDial(document.getElementById('jogdial'));

  var dial = JogDial(document.getElementById('jogdial'),{
    debug : false,
    touchMode : 'knob',  // knob | wheel
    knobSize : '30%',
    wheelSize : '100%',
    zIndex : 9999,
    degreeStartAt : 0,
    minDegree : null,  // (null) infinity
    maxDegree : null   // (null) infinity
  })

  addEventListener("mousemove", function(evt){
    // on move
    // event.target.rotation
  });

  addEventListener("mousedown", function(evt){
    // on move
    // event.target.rotation
  });

  addEventListener("mouseup", function(evt){
    // on move
    // event.target.rotation
  });


  const statusLog = document.querySelector('#messages')

  const clearStatusLog = document.querySelector('.clearStatusLog')
  clearStatusLog.addEventListener("click", (e) => statusLog.innerHTML = '')

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

  setFrequencyButton.addEventListener('click', function () {
    if (MorseJs.empty) {
      morseInit()
    }
    currentFreq.innerHTML = currentFrequencyInput.value.toString()
    updateFreq(currentFrequencyInput.value.toString())

    currentFrequency = currentFrequencyInput.value.toString().replaceAll('.', '')

    socket.emit('chat message', '6,' + currentFrequency)
    console.log(currentFrequency)

    // MorseJs.Play("cq cq de n5jlc k", 20, 500);
  })

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

  function writeMessageToScreen (msg) {
    $('#messages').append($('<li>').text(msg)).scrollTop($('#messages')[0].scrollHeight)
    statusLines--
    if (statusLines === 0) {
      statusLines = 500
      $('#messages').empty()
    }
    if (msg.includes(':')) {
      const tmpObj = {}
      tmpObj.freq = msg.split(':')[0]
      tmpObj.swr = msg.split(':')[1]
      swrData.push(tmpObj)
    }
  }

  socket.on('chat message',function (msg) {
    writeMessageToScreen(msg)
  })

  $('.freqSlider').on('input', function () {
    this.min = lowFreqLimit.value.toString().replaceAll('.', '')
    this.max = highFreqLimit.value.toString().replaceAll('.', '')
    this.step = sweepStep.value.toString().replaceAll('.', '')

    currentFreq.innerHTML = this.value
    updateFreq(this.value.toString())
    socket.emit('chat message', '2,' + this.value)
  })

  $('.stopButon').on('click', function () {
    currentFreq.innerHTML = '0'
    updateFreq('000.000.000')
    socket.emit('chat message', '2,' + 0)
    if (oscillator) {
      oscillator.stop()
    }
    console.log('STOP sent')
    writeMessageToScreen('STOP Sent')
  })

  $('.sendMessageButton').on('click', function () {
    const message = $('.messageTextInput').val().toUpperCase()
    getCodes(message)
  })

  $('.sendWsprButton').on('click', function () {
    wsprCounter = parseInt($('.wsprCyclesCount').val())
    waitEvenMinute()
  })

  $('.cwArea').on('mousedown', function () {
    socket.emit('chat message', '2,' + currentFrequency)

    // create Oscillator node
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
  }).on('mouseup', function () {
    if (!isContinous) {
      socket.emit('chat message', '2,' + 0)
    }
    if (oscillator && !isContinous) {
      oscillator.stop()
    }
  })

  $('.timeButton').on('click', function () {
    socket.emit('chat message', '4,' + timeSynch())
    console.log('timeSynch sent')
    writeMessageToScreen('timeSynch sent')
  })

  function timeSynch () {
    let date = new Date()
    const localOffset = date.getTimezoneOffset() * 60000
    const localTime = date.getTime()
    date = localTime - localOffset
    return Math.floor(date / 1000)
  }

  $('input[type=radio][name=power]').change(function () {
    socket.emit('chat message', '3,' + this.value)
  })

  continuousTX.addEventListener('change', function () {
    isContinous = !isContinous
  })

  var display = new SegmentDisplay('display')
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

  let timeout
  const transmitting = false

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

      socket.emit('chat message', '7,' + 'wspr')

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
      socket.emit('chat message', '8,' + message)
    }, timeToEven * 1000)
  }

  function getCodes (textMessage) {
    fetch('http://192.168.1.20:3070/', {
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
        // return data
      })
  }

  function stringToArray (c) {
    const b = []
    let d = []
    let a
    a = c.toString()
    a.split('').forEach(e => { b.push(e); b.push(',') })
    d = b.join('')
    console.log(d)
  }
}
