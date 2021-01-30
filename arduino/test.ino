String a;

void setup() {

Serial.begin(115200); // opens serial port, sets data rate to 9600 bps
Serial.setTimeout(2);

}

void loop() {

while(Serial.available()) {

a= Serial.readString();// read the incoming data as string

Serial.println(a);

}

}
