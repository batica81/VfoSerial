$(function () {

    // create web audio api context
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    var oscillator;
    var isContinous = false;

    let currentFrequency = 0;
    let setFrequencyButton = document.querySelector('.setFrequencyButton');
    let currentFrequencyInput = document.querySelector('.currentFrequencyInput');
    let continuousTX = document.querySelector('#continuousTX');

// autoNumeric with the defaults options
    let anElement = new AutoNumeric(currentFrequencyInput, {
        // currencySymbol : ' €',
        decimalCharacter : ',',
        digitGroupSeparator : '.',
        allowDecimalPadding: false

    });

    setFrequencyButton.addEventListener("click", function (){
        if (MorseJs.empty){
            morseInit();
        }
        currentFrequency = currentFrequencyInput.value.toString().replaceAll(".", "");
        console.log(currentFrequency);
        // MorseJs.Play("cq cq de n5jlc k", 20, 500);
    })

    var socket = io();
    $('form').submit(function(e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    // socket.on('chat message', function(msg){
    //     $('#messages').append($('<li>').text(msg));
    // });

    $('.freqSlider').on("input", function () {
        socket.emit('chat message', this.value);
        // console.log(this.value);
    })

    $('.stopButon').on("click", function () {
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
        return Math.floor(Date.now()/1000);

    }

    $('input[type=radio][name=power]').change(function() {
        socket.emit('chat message',  "3," + this.value);
        console.log("Power sent");
    });

    continuousTX.addEventListener("change", function (){
        isContinous = !isContinous;
        console.log(isContinous)
    })


})
