const Discord = require("discord.js");
const { Readable } = require("stream");
const YouTube = require("youtube-sr").default;

const { play, stop, skip } = require("./music/commands.js");
const { transcribe } = require("./speechtotext/transcribeLocal.js");
// const { transcribe } = require("./speechtotext/transcribeGCP.js");

// CONSTANTS
const client = new Discord.Client();

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);

class Silence extends Readable {
  _read() {
    this.push(SILENCE_FRAME);
    this.destroy();
  }
}

// HELPER FUNCTIONS
const listen = async (connection, message) => {
  console.log("Connected");

  connection.play(new Silence(), { type: "opus" });
  transcribeSpeech(connection, message);
};

const transcribeSpeech = async (voiceConnection, message) => {
  channel = message.channel;

  voiceConnection.on("speaking", async (user, speaking) => {
    if (speaking.bitfield == 0 || user.bot) {
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

    let transcription = await transcribe(
      Buffer.concat(chunks),
      user.username,
      message.guild.id
    );

    console.log(`${user.username}: ${transcription}`);

    if (transcription && transcription != "") {
      if (transcription.startsWith("hey sona play")) {
        songname = transcription.substring(14, transcription.length);
        YouTube.searchOne(songname)
          .then((x) => play(voiceConnection, message, x.id))
          .catch(console.error);
        console.log(songname);
      } else if (
        transcription == "hey sona stop playing" ||
        transcription == "pesona stop playing" ||
        transcription == "persona stop playing" ||
        transcription == "asuna stop playing"
      ) {
        stop(message);
        console.log("stopped");
      } else if (transcription == "hey sona skip") {
        skip(message);
        console.log("skipped");
      }
    }
    channel.send(`${user.username}: ${transcription}`);
  });
};

// MAIN
client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

// Voice Mode
client.on("message", async (message) => {
  if (message.author.bot) return;

  if (message.content === "-join" && message.member.voice.channel) {
    const voiceConnection = await message.member.voice.channel.join();
    listen(voiceConnection, message);
  } else if (message.content === "-leave" && message.member.voice.channel) {
    if (!message.guild.me.voice.channel) {
      return message.channel.send("I'm not in a voice channel");
    } else {
      message.guild.me.voice.channel.leave();
    }
  }
});

// Manual Music
client.on("message", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("-play") && message.member.voice.channel) {
    const voiceConnection = await message.member.voice.channel.join();
    songname = message.content.substring(6, message.content.length);
    YouTube.searchOne(songname)
      .then((x) => play(voiceConnection, message, x.id))
      .catch(console.error);
  } else if (message.content == "-stop" && message.member.voice.channel) {
    stop(message);
  } else if (message.content == "-skip" && message.member.voice.channel) {
    skip(message);
  }
});

client.login("ODgwNjc2NzMzNTg4NzMzOTcz.YShwHw.5ToVpYPfu4d6jHDWEZIrQFlmPSo");
