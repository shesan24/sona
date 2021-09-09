var wavConverter = require("wav-converter");
const fs = require("fs");
const PythonShell = require("python-shell").PythonShell;

const transcribe = async (rawData, username, guildId) => {
  return new Promise((resolve, reject) => {
    const processedData = wavConverter.encodeWav(rawData, {
      numChannels: 2,
      sampleRate: 48000,
      byteRate: 4,
    });

    let result = "";

    if (processedData.length / 48000 / 4 >= 0.5) {
      const filename =
        "./speechtotext/" +
        guildId +
        "_" +
        username +
        "_" +
        Date.now() +
        ".wav";
      fs.writeFile(filename, processedData, (err) => {
        if (err) return console.error(err);
      });

      let pyshell = new PythonShell("speechToText.py", {
        mode: "text",
        scriptPath: "./speechtotext/",
        args: [filename],
      });

      // sends a message to the Python script via stdin
      pyshell.send("message");

      // received a message sent from the Python script (a simple "print" statement)
      pyshell.on("message", (transcription) => {
        if (transcription) result = transcription.toLowerCase();
        fs.unlinkSync(filename);
      });

      // end the input stream, delete the temporary file and allow the process to exit
      pyshell.end((err) => {
        // if (err) throw err;
        // if (err) reject(err);
        resolve(result);
      });
    }
  });
};

exports.transcribe = transcribe;
