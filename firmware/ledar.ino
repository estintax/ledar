#define MODEL_ID    "1"
#define MODEL_NAME  "LEDAr Prototype rev.4"
#define FIRMWARE    "7"

#define EB_BETTER_ENC
#define EB_HALFSTEP_ENC
#include <EncButton.h>
#include <LiquidCrystal.h>
EncButton<EB_TICK, A1, A2, A3> enc;
LiquidCrystal lcd(A4, A5, A7, A6, 11, 12);

String lcd_text = "";
String lcd_secondText = "";

const int leds[] = {2, 3, 5, 6, 9, 10};
const int speaker = A0;

// https://stackoverflow.com/questions/9072320/split-string-into-string-array
String getValue(String data, char separator, int index)
{
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length()-1;

  for(int i=0; i<=maxIndex && found<=index; i++){
    if(data.charAt(i)==separator || i==maxIndex){
        found++;
        strIndex[0] = strIndex[1]+1;
        strIndex[1] = (i == maxIndex) ? i+1 : i;
    }
  }

  return found>index ? data.substring(strIndex[0], strIndex[1]) : "";
}

String buff = "";

void setup() {
  // put your setup code here, to run once:
  Serial.begin(250000);
  lcd.begin(8, 2);
  lcd.print("LEDAr v"FIRMWARE);
  Serial.println("LCD_DONE;");
  for (int i = 0; i < sizeof(leds) / sizeof(leds[0]); i++) {
    pinMode(leds[i], OUTPUT);
    digitalWrite(leds[i], HIGH);
    delay(100);
    digitalWrite(leds[i], LOW);
    Serial.println("PIN_MODE;" + String(i) + ";OUTPUT;");
  }
  delay(100);
  Serial.println("READY;");
}

void loop() {
  // put your main code here, to run repeatedly:
  enc.tick();
  if(enc.left()) Serial.println("ENC;LEFT;");
  if(enc.right()) Serial.println("ENC;RIGHT;");
  if(enc.press()) Serial.println("ENC;PRESS;");
  if(enc.release()) Serial.println("ENC;RELEASE;");
  if(Serial.available() > 0) {
    char in = char(Serial.read());
    buff += in;
    if(in == '\n') {
      String input = buff;
      buff = "";
      String cmd = getValue(input, ';', 0);
      if(cmd == "LED") {
        int led = getValue(input, ';', 1).toInt();
        if(led >= sizeof(leds) / sizeof(leds[0]) || led < 0) {
          Serial.println("ERROR;2;");
          return;
        }
        int state = getValue(input, ';', 2).toInt();
        if(state == 1) digitalWrite(leds[led], HIGH);
        else if(state == 0) digitalWrite(leds[led], LOW);
        else Serial.println("ERROR;1;");
      } else if(cmd == "FADE") {
        int led = getValue(input, ';', 1).toInt();
        if(led >= sizeof(leds) / sizeof(leds[0]) || led < 0) {
          Serial.println("ERROR;2;");
          return;
        }
        int state = getValue(input, ';', 2).toInt();
        if(state >= 0 && state < 256) analogWrite(leds[led], state);
        else Serial.println("ERROR;1;");
      } else if(cmd == "COUNT") {
        Serial.println("COUNT;" + String(sizeof(leds) / sizeof(leds[0])) + ";");
      } else if(cmd == "VERSION") {
        Serial.println("VERSION;" + String(FIRMWARE) + ";");
      } else if(cmd == "RESET") {
        for (int i = 0; i < sizeof(leds) / sizeof(leds[0]); i++) {
          digitalWrite(leds[i], LOW);
        }
        noTone(speaker);
        Serial.println("RESET;");
      } else if(cmd == "MODEL") {
        Serial.println("MODEL;" + String(MODEL_ID) + ";" + String(MODEL_NAME) + ";");
      } else if(cmd == "LCDLN") {
        String text = getValue(input, ';', 1);
        if(text.length() > 16) {
          Serial.println("LCD;ERROR;LENGTH;");
          return;
        }
        String secondText = "";
        if(text.length() > 8) {
          secondText = text.substring(7);
          text = text.substring(0, 7);
        }

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print(text);
        if(secondText != "") {
          lcd.setCursor(0, 1);
          lcd.print(secondText);
        }
        Serial.println("LCD;OK;" + text + ";" + secondText + ";");
      } else if(cmd == "LCDEX" || cmd == "LCD") {
        String text = getValue(input, ';', 1);
        if(text.length() > 8) {
          Serial.println("LCD;ERROR;LENGTH;");
          return;
        }
        String secondText = getValue(input, ';', 2);
        if(secondText.length() > 8) {
          Serial.println("LCD;ERROR;LENGTH;");
        }
        if(text != lcd_text) {
          if(text != "-") {
            lcd.setCursor(0, 0);
            lcd.print("        ");
            lcd.setCursor(0, 0);
            lcd.print(text);
            lcd_text = text;
          }
        }
        if(secondText != lcd_secondText) {
          if(secondText != "-") {
            lcd.setCursor(0, 1);
            lcd.print("        ");
            lcd.setCursor(0, 1);
            lcd.print(secondText);
            lcd_secondText = secondText;
          }
        }
        Serial.println("LCD;OK;" + lcd_text + ";" + lcd_secondText + ";");
      } else if(cmd == "BUZZ" || cmd == "BUZZT") {
        int freq = getValue(input, ';', 1).toInt();
        if(freq <= 31) {
          Serial.println("BUZZ;ERROR;VERYLOWFREQ;");
          return;
        }
        if(freq > 14000) {
          Serial.println("BUZZ;ERROR;VERYHIGHFREQ;");
          return;
        }
        int duration;
        if (cmd == "BUZZT")
          duration = getValue(input, ';', 2).toInt();
        else
          duration = 0;
        if(duration == 0) tone(speaker, freq);
        else tone(speaker, freq, duration);
        Serial.println("BUZZ;OK;");
      } else if(cmd == "NOBUZZ") {
        noTone(speaker);
      }
    }
  }
}