const Discord = require("discord.js");
const client = new Discord.Client();
const { Readable } = require("stream");
var wavConverter = require("wav-converter");
const fs = require("fs");
const PythonShell = require("python-shell").PythonShell;

// CONSTANTS
const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class Silence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
    this.destroy();
  }
}

// HELPER FUNCTIONS
const listen = async (connection, channel) => {
  connection.play(new Silence(), { type: "opus" });
  transcribeSpeech(connection, channel);
};

const transcribeSpeech = async (voiceConnection, channel) => {
  voiceConnection.on("speaking", async (user, speaking) => {
    if (speaking.bitfield == 0 /*|| user.bot*/) {
      return;
    }

    // creates a 16-bit signed PCM, stereo 48KHz stream
    const audioStream = voiceConnection.receiver.createStream(user, {
      mode: "pcm",
    });

    audioStream.on("error", (e) => {
      console.log("audio stream error: " + e);
      return;
    });

    // Try-Catch since it does not work for CHROME browser!!!
    const chunks = [];
    try {
      for await (let chunk of audioStream) {
        chunks.push(chunk);
      }
    } catch (e) {
      console.log("buffer error: " + e);
      return;
    }
    const rawData = Buffer.concat(chunks);

    // // add headers to convert from PCM to Wav format
    const processedData = wavConverter.encodeWav(rawData, {
      numChannels: 2,
      sampleRate: 48000,
      byteRate: 4,
    });

    //  data too short to transcribe (less than one sec)
    if (processedData.length / 48000 / 4 >= 1.0) {
      const filename =
        "./speechtotext/" + user.username + "_" + Date.now() + ".wav";
      fs.writeFile(filename, processedData, (err) => {
        if (err) return console.error(err);
      });

      let pyshell = new PythonShell("main.py", {
        mode: "text",
        scriptPath: "./speechtotext/",
        args: [filename],
      });

      // sends a message to the Python script via stdin
      pyshell.send("message");

      // received a message sent from the Python script (a simple "print" statement)
      pyshell.on("message", function (message) {
        // send the transcription
        if (message && message != "") {
          channel.send(`${user.username}: ${message}`);
        }
      });

      // end the input stream and allow the process to exit
      pyshell.end(function (err, code, signal) {
        fs.unlinkSync(filename);
      });
    }
  });
};

// MAIN
client.once("ready", () => {
  console.log("Ready!");
});

client.on("message", async (message) => {
  if (message.content === ".join" && message.member.voice.channel) {
    const connection = await message.member.voice.channel.join();
    console.log("Connected");
    listen(connection, message.channel);
  }
});

client.on("message", async (message) => {
  if (message.content === ".leave" && message.member.voice.channel) {
    if (!message.guild.me.voice.channel) {
      return message.channel.send("I'm not in a voice channel");
    } else {
      message.guild.me.voice.channel.leave();
      console.log("Left");
    }
  }
});

client.login();
