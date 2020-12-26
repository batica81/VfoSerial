#include "si5351.h"
#include "Wire.h"
#include "TimeLib.h"

Si5351 si5351(0x60);

const int ledPin = 13; // the number of the LED pin
int modeSelector = 1;  //
int command = 1;

unsigned long pctime;

void setup() {
  pinMode(A0, INPUT);
  pinMode(A1, INPUT);
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  if (si5351.init(SI5351_CRYSTAL_LOAD_8PF, 25002152, 0)) {
    Serial.println("SI5351 found, enabling clk0");
    si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_2MA); // Set for max power if desired  OPTIONS: 2 4 6 8 (MA)
  }
  else {
    Serial.println("SI5351 not found");
  }
  
  Serial.println("Arduino is ready.");
//  Serial.println("<Arduino is ready, send new frequency in Hz, e.g. 81000 for 81kHz. (max=200000000=200MHz)>");
}

void loop() {
  updateFrequency();
}

void updateFrequency() {


  while (Serial.available() > 0) {
    int modeSelector = Serial.parseInt();
    uint32_t command = Serial.parseInt();

    if (Serial.read() == '\n') {
     switch (modeSelector) {
        case 1: // Testing if live
          Serial.println("ready 1");
          Serial.println(command);
          break;
  
        case 2: // Play simple tone, stop on 0
          Serial.println("ready 2");
          play(command);
          break;
  
        case 3: // Set power level
          Serial.println("ready 3");
          setPowerLevel(command);
          break;
  
        case 4: // Set time
          Serial.println("ready 4");
          setTime(command);
          digitalClockDisplay();
          break;
      }
    }
  }
}

void play(uint32_t tx) {
  if ( (1 < tx) && (tx < 200000001) ) {
    digitalWrite(ledPin, HIGH);
    si5351.set_freq(tx * SI5351_FREQ_MULT, SI5351_CLK0);
    si5351.output_enable(SI5351_CLK0, 1);

    // calculate SWR
    delay(50);
    float FWD = (float)analogRead(A0);
    float REV = (float)analogRead(A1);
    float SWR = (FWD + REV) / (FWD - REV);

    Serial.print(tx);
    Serial.print(":");
    Serial.println(SWR);
  }
  if (tx == 0) {
    digitalWrite(ledPin, LOW);
    si5351.output_enable(SI5351_CLK0, 0);
  }
}

void setPowerLevel(int level) {
       switch (level) {
        case 2:
          si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_2MA);
          Serial.println("TX Power set to 2MA");
          break;
  
        case 4:
          si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_4MA);
          Serial.println("TX Power set to 4MA");
          break;
  
        case 6:
          si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_6MA);
          Serial.println("TX Power set to 6MA");
          break;
  
        case 8:
          si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_8MA);
          Serial.println("TX Power set to 8MA");
          break;
      }
}

void digitalClockDisplay(){
  // digital clock display of the time
  Serial.print(hour());
  printDigits(minute());
  printDigits(second());
  Serial.print(" ");
  Serial.print(day());
  Serial.print(" ");
  Serial.print(month());
  Serial.print(" ");
  Serial.print(year()); 
  Serial.println(); 
}

void printDigits(int digits){
  // utility function for digital clock display: prints preceding colon and leading 0
  Serial.print(":");
  if(digits < 10)
    Serial.print('0');
  Serial.print(digits);
}
