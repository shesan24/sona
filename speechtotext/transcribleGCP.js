const speech = require("@google-cloud/speech");
var wavConverter = require("wav-converter");

const speechClient = new speech.SpeechClient();

const transcribe = async (rawData, username, guildId) => {
  // // add headers to convert from PCM to Wav format
  const processedData = wavConverter.encodeWav(rawData, {
    numChannels: 2,
    sampleRate: 48000,
    byteRate: 4,
  });

  //  data too short to transcribe (less than half a sec)
  if (processedData.length / 48000 / 4 >= 0.5) {
    const request = {
      config: {
        sampleRateHertz: 48000,
        languageCode: "en-US",
        audioChannelCount: 2,
      },
      audio: {
        content: processedData.toString("base64"),
      },
    };

    // detects speech in the audio file
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    if (!transcription) return "";
    transcription = transcription.toLowerCase();
    return transcription;
  }
};

exports.transcribe = transcribe;
