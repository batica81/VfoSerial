#include <si5351.h>
#include <JTEncode.h>
#include <rs_common.h>
#include <int.h>
#include <string.h>
#include "Wire.h"

#define WSPR_TONE_SPACING       146          // ~1.46 Hz
#define FT8_TONE_SPACING        625          // ~6.25 Hz

#define WSPR_DELAY              683          // Delay value for WSPR
#define FT8_DELAY               159          // Delay value for FT8

#define WSPR_DEFAULT_FREQ       14097200UL
#define FT8_DEFAULT_FREQ        5154000UL

#define DEFAULT_MODE            MODE_FT8

#define BUTTON                  12
#define LED_PIN                 13

enum mode {MODE_WSPR, MODE_FT8};

// Class instantiation
Si5351 si5351;
JTEncode jtencode;

// Global variables
unsigned long freq;
char message[] = "N0CALL AA00";
char call[] = "N0CALL";
char loc[] = "AA00";
uint8_t dbm = 27;
uint8_t tx_buffer[255];
enum mode cur_mode = DEFAULT_MODE;
uint8_t symbol_count;
uint16_t tone_delay, tone_spacing;

// Loop through the string, transmitting one character at a time.
void encode()
{
  uint8_t i;

  // Reset the tone to the base frequency and turn on the output
  si5351.output_enable(SI5351_CLK0, 1);
  digitalWrite(LED_PIN, HIGH);

  for(i = 0; i < symbol_count; i++)
  {
      si5351.set_freq((freq * 100) + (tx_buffer[i] * tone_spacing), SI5351_CLK0);
      delay(tone_delay);
  }

  // Turn off the output
  si5351.output_enable(SI5351_CLK0, 0);
  digitalWrite(LED_PIN, LOW);
}

void set_tx_buffer()
{
  // Clear out the transmit buffer
  memset(tx_buffer, 0, 255);

  // Set the proper frequency and timer CTC depending on mode
  switch(cur_mode)
  {
  case MODE_WSPR:
    jtencode.wspr_encode(call, loc, dbm, tx_buffer);
    break;
  case MODE_FT8:
    jtencode.ft8_encode(message, tx_buffer);
    break;
  }
}

void setup()
{
  si5351.init(SI5351_CRYSTAL_LOAD_8PF, 25002152, 0); //Miletova kalibracija 

  // Use the Arduino's on-board LED as a keying indicator.
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Use a button connected to pin 12 as a transmit trigger
  pinMode(BUTTON, INPUT_PULLUP);

    cur_mode = MODE_FT8;

  // Set the proper frequency, tone spacing, symbol count, and
  // tone delay depending on mode
  switch(cur_mode)
  {
  case MODE_WSPR:
    freq = WSPR_DEFAULT_FREQ;
    symbol_count = WSPR_SYMBOL_COUNT; // From the library defines
    tone_spacing = WSPR_TONE_SPACING;
    tone_delay = WSPR_DELAY;
    break;
  case MODE_FT8:
    freq = FT8_DEFAULT_FREQ;
    symbol_count = FT8_SYMBOL_COUNT; // From the library defines
    tone_spacing = FT8_TONE_SPACING;
    tone_delay = FT8_DELAY;
    break;
   }

  // Set CLK0 output
  si5351.drive_strength(SI5351_CLK0, SI5351_DRIVE_2MA); // Set for max power if desired  OPTIONS: 2 4 6 8
  si5351.output_enable(SI5351_CLK0, 0); // Disable the clock initially

  // Encode the message in the transmit buffer
  // This is RAM intensive and should be done separately from other subroutines
  set_tx_buffer();
}

void loop()
{
  // Debounce the button and trigger TX on push
  if(digitalRead(BUTTON) == LOW)
  {
    delay(50);   // delay to debounce
    if (digitalRead(BUTTON) == LOW)
    {
      encode();
      delay(50); //delay to avoid extra triggers
    }
  }
}
