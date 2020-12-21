// 2.11.2018, Arduino IDE v1.8.7, v0.2
// CW Beacon using Si5351, LZ2WSG, KN34PC, прилагодено од Z33T
//---------------------------------------------------------------------------------------------------------
#include "si5351.h"
#define PIN_SP 10

Si5351 si5351(0x60);

uint32_t tx = 6900000;   // Излезна Фреквенција на радио-фарот во херци

// constants won't change. They're used here to set pin numbers:
const int SLEUTEL = 2;    // the number of the pushbutton pin
const int ledPin = 13;      // the number of the LED pin

boolean PrevS = false;
boolean S = false;


//---------------------------------------------------------------------------------------------------------
void setup() {
  pinMode(SLEUTEL, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);
  
  si5351.init(SI5351_CRYSTAL_LOAD_8PF, 25002152, 0); //Miletova kalibracija 
  si5351.output_enable(SI5351_CLK0, 0);

  Serial.begin(9600);
}
//---------------------------------------------------------------------------------------------------------
void loop() {

  // if there's any serial available, read it:
  while (Serial.available() > 0) {
    // look for the next valid integer in the incoming serial stream:
    uint32_t red = Serial.parseInt();
        if (Serial.read() == '\n') {
          if ( (7999 < red) && (red < 150000001) ) {
            tx = red;
//            Serial.println(tx);
//            Serial.println("");
            cw(true);
            digitalWrite(ledPin, HIGH);
          }
          if (red == 0) {
            cw(false);
            digitalWrite(ledPin, LOW);
//            Serial.println("TXOFF");
//            Serial.println("");
          }
        }
  }
       
//  S = !digitalRead(SLEUTEL);
//
//  if (S) {
//    if (S != PrevS) {
//      cw(true);
//      digitalWrite(ledPin, HIGH);
//    }
//  }
//  else {
//    if (S != PrevS) {
//      cw(false);
//      digitalWrite(ledPin, LOW);
//    }
//  }
//
//  PrevS = S;
  delay(1);
                      
}


//---------------------------------------------------------------------------------------------------------
void cw(bool state) {                                 
  if (state) {
    si5351.set_freq(tx * SI5351_FREQ_MULT, SI5351_CLK0);
    si5351.output_enable(SI5351_CLK0, 1);
  }
  else {
    si5351.output_enable(SI5351_CLK0, 0);
  }
}

//- - - - - - - - - - - - - - - - - - - - - - - - - -
