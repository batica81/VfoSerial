var oscillator;
var isContinous = false;

var statusLines = 500;
let currentFrequency = 0;

var swrData = [];

$(function () {

    // create web audio api context
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var socket = io();

    let setFrequencyButton = document.querySelector('.setFrequencyButton');
    let currentFrequencyInput = document.querySelector('.currentFrequencyInput');
    let continuousTX = document.querySelector('#continuousTX');
    let currentFreq = document.querySelector('.currentFreq');

    let lowFreqLimit = document.querySelector('.lowFreqLimit');
    let highFreqLimit = document.querySelector('.highFreqLimit');
    let sweepStep = document.querySelector('.sweepStep');

// autoNumeric with the defaults options
    new AutoNumeric(currentFrequencyInput, {
        decimalCharacter : ',',
        digitGroupSeparator : '.',
        allowDecimalPadding: false
    });

    new AutoNumeric(lowFreqLimit, {
        decimalCharacter : ',',
        digitGroupSeparator : '.',
        allowDecimalPadding: false
    });

    new AutoNumeric(highFreqLimit, {
        decimalCharacter : ',',
        digitGroupSeparator : '.',
        allowDecimalPadding: false
    });

    new AutoNumeric(sweepStep, {
        decimalCharacter : ',',
        digitGroupSeparator : '.',
        allowDecimalPadding: false
    });

    setFrequencyButton.addEventListener("click", function (){
        if (MorseJs.empty){
            morseInit();
        }
        currentFreq.innerHTML = currentFrequencyInput.value.toString();
        updateFreq(currentFrequencyInput.value.toString());

        currentFrequency = currentFrequencyInput.value.toString().replaceAll(".", "");

        // MorseJs.Play("cq cq de n5jlc k", 20, 500);
    })

    function updateFreq(freq){
        let tmpFreq = ("000000000" + freq);
        let tmpFreq2 = tmpFreq.substring(tmpFreq.length - 11);

        if (!tmpFreq2.includes(".")) {
            let tmpFreq3 = tmpFreq.substring(tmpFreq.length - 9);
            let a = tmpFreq3.split("");
            a.splice(-3, 0, ".");
            a.splice(-7, 0, ".");
            tmpFreq2 = a.join("");
        }
        display.setValue(tmpFreq2);
    }

    // $('form').submit(function(e) {
    //     e.preventDefault(); // prevents page reloading
    //     socket.emit('chat message', $('#m').val());
    //     $('#m').val('');
    //     return false;
    // });

    socket.on('chat message', function(msg){
        $('#messages').append($('<li>').text(msg)).scrollTop($("#messages")[0].scrollHeight);
        statusLines--;
        if (statusLines === 0) {
            statusLines = 500;
            $('#messages').empty();
        }
        if (msg.includes(":")) {
            let tmpObj = {};
            tmpObj["freq"] = msg.split(":")[0];
            tmpObj["swr"] = msg.split(":")[1];
            swrData.push(tmpObj);
        }
    });

    $('.freqSlider').on("input", function () {
        this.min = lowFreqLimit.value.toString().replaceAll(".", "");
        this.max = highFreqLimit.value.toString().replaceAll(".", "");
        this.step = sweepStep.value.toString().replaceAll(".", "");

        currentFreq.innerHTML = this.value;
        updateFreq(this.value.toString());
        socket.emit('chat message', "2," + this.value);
    })

    $('.stopButon').on("click", function () {
        currentFreq.innerHTML = "0";
        updateFreq("000.000.000");
        socket.emit('chat message',  "2," + 0);
        if (oscillator){
            oscillator.stop();
        }
        console.log("STOP sent");
    })

    $('.cwArea').on("mousedown", function () {
        socket.emit('chat message', "2," + currentFrequency);

        // create Oscillator node
        if  (currentFrequency < 96000) {
            oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(currentFrequency, audioCtx.currentTime); // value in hertz
            oscillator.connect(audioCtx.destination);
            oscillator.start();
        } else {
            console.log('Sidetone only up to 96khz');
        }

    }).on("mouseup", function () {
        if (!isContinous) {
            socket.emit('chat message', "2," + 0);
        }
        if (oscillator && !isContinous){
            oscillator.stop();
        }

    })

    $('.timeButton').on("click", function () {
        socket.emit('chat message',  "4," + timeSynch());
        console.log("timeSynch sent");
    })

    function timeSynch(){
        let date = new Date();
        let localOffset = date.getTimezoneOffset() * 60000;
        let localTime = date.getTime();
        date = localTime - localOffset;
        return Math.floor(date/1000);
    }

    $('input[type=radio][name=power]').change(function() {
        socket.emit('chat message',  "3," + this.value);
    });

    continuousTX.addEventListener("change", function (){
        isContinous = !isContinous;
    })

    var display = new SegmentDisplay("display");
    display.pattern         = "###.###.###";
    display.displayAngle    = 10;
    display.digitHeight     = 20;
    display.digitWidth      = 12;
    display.digitDistance   = 2.5;
    display.segmentWidth    = 2.5;
    display.segmentDistance = 0.5;
    display.segmentCount    = 7;
    display.cornerType      = 3;
    display.colorOn         = "#e95d0f";
    display.colorOff        = "#4b1e05";
    display.draw();

    display.setValue('000.000.000');

})
