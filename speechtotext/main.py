import sys
import speech_recognition as sr

r = sr.Recognizer()

harvard = sr.AudioFile(sys.argv[1])
with harvard as source:
    audio = r.record(source)

print(r.recognize_google(audio))