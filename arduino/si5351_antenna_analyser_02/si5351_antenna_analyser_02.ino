#include "si5351.h"
#include "Wire.h"
#include "TimeLib.h"
#include <JTEncode.h>
#include <rs_common.h>
#include <int.h>
#include <string.h>


#define WSPR_TONE_SPACING       146          // ~1.46 Hz
#define WSPR_DELAY              683          // Delay value for WSPR
#define WSPR_DEFAULT_FREQ       7040000UL

#define ledPin                 13

enum mode {MODE_WSPR};

// Class instantiation
Si5351 si5351(0x60);
JTEncode jtencode;

// Global variables
unsigned long freq;
char call[] = "YU4HAK";
char loc[] = "KN04";
uint8_t dbm = 10;
uint8_t tx_buffer[255];
enum mode cur_mode = MODE_WSPR;
uint8_t symbol_count;
uint16_t tone_delay, tone_spacing;


bool timeWasSet = false;

unsigned long pctime;

String sdata = ""; // Initialised to nothing.

void setup() {

  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // Set the proper frequency, tone spacing, symbol count, and
  // tone delay depending on mode
  switch (cur_mode) {
    case MODE_WSPR:
      freq = WSPR_DEFAULT_FREQ;
      symbol_count = WSPR_SYMBOL_COUNT; // From the library defines
      tone_spacing = WSPR_TONE_SPACING;
      tone_delay = WSPR_DELAY;
      break;
  }


  // Encode the message in the transmit buffer
  // This is RAM intensive and should be done separately from other subroutines
  set_tx_buffer();

  pinMode(A0, INPUT); // FWD
  pinMode(A1, INPUT);  // REV
  Serial.begin(115200);
  Serial.setTimeout(5);

  if (si5351.init(SI5351_CRYSTAL_LOAD_8PF, 25002152, 0)) { //Miletova kalibracija
    Serial.println("SI5351 found, enabling clk0");
    si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_2MA); // Set for max power if desired  OPTIONS: 2 4 6 8 (MA)
    si5351.output_enable(SI5351_CLK0, 0); // Disable the clock initially
  }
  else {
    Serial.println("SI5351 not found");
  }

  Serial.println("Arduino is ready.");
}

void loop() {
  updateFrequency();
}

void updateFrequency() {
  String sdata;
  int modeSelector;
  String command;

  while (Serial.available() ) {

    sdata = Serial.readString();
    sdata.trim();
    modeSelector = sdata.substring(0, 1).toInt();
    command = sdata.substring(2);

    switch (modeSelector) {
      case 1: // Testing if live
        Serial.println(command);
        Serial.println("OK");
        break;

      case 2: // Play simple tone, stop on 0
        play(command.toInt());
        break;

      case 3: // Set power level
        setPowerLevel(command.toInt());
        break;

      case 4: // Set time
        setTime(command.toInt());
        timeWasSet = true;
        digitalClockDisplay();
        break;

      case 5: // Get time
        digitalClockDisplay();
        break;


      case 7: // Send WSPR message
        // set frequency
        // update time - do on client!
        // wait for timeslot

//         cur_mode = MODE_WSPR;
        Serial.println("sending wspr");
//         Serial.println(tx_buffer);
        encode();
        break;


    } // end switch
  } //end while serial

  sdata = ""; // Clear the string ready for the next command.
}

void waitTimeslot(){
  int toNext;

  second();
  delay(toNext * 1000);
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

void digitalClockDisplay() {
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

void printDigits(int digits) {
  // utility function for digital clock display: prints preceding colon and leading 0
  Serial.print(":");
  if (digits < 10)
    Serial.print('0');
  Serial.print(digits);
}


// Loop through the string, transmitting one character at a time.
void encode() {
  uint8_t i;

  // Reset the tone to the base frequency and turn on the output
  si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_8MA);
  si5351.output_enable(SI5351_CLK0, 1);
  digitalWrite(ledPin, HIGH);

  for (i = 0; i < symbol_count; i++) {
    si5351.set_freq((freq * 100) + (tx_buffer[i] * tone_spacing), SI5351_CLK0);
    delay(tone_delay);
  }

  // Turn off the output
  si5351.output_enable(SI5351_CLK0, 0);
  digitalWrite(ledPin, LOW);
}

void set_tx_buffer() {
  // Clear out the transmit buffer
  memset(tx_buffer, 0, 255);

  // Set the proper frequency and timer CTC depending on mode
  switch (cur_mode) {
    case MODE_WSPR:
      jtencode.wspr_encode(call, loc, dbm, tx_buffer);
      break;
  }
}
