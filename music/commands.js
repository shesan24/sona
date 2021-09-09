const ytdl = require("ytdl-core");

let queue = new Map();

const execute = (guild, song) => {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    // serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      execute(guild, serverQueue.songs[0]);
    })
    .on("error", (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

  serverQueue.textChannel.send(`Started playing: **${song.title}**`);
};

const play = async (voiceConnection, message, url) => {
  serverQueue = queue.get(message.guild.id);
  const voiceChannel = message.member.voice.channel;

  const songInfo = await ytdl.getInfo(url);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    queue.set(message.guild.id, queueContruct);
    queueContruct.songs.push(song);

    try {
      queueContruct.connection = voiceConnection;
      execute(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return;
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(
      `**${song.title}** has been added to the queue`
    );
  }
};

const stop = (message) => {
  serverQueue = queue.get(message.guild.id);
  if (!serverQueue) return message.channel.send("No songs to stop!");

  serverQueue.songs = [];
  serverQueue.textChannel.send("Stopped playing");
  serverQueue.connection.dispatcher.end();
};

const skip = (message) => {
  serverQueue = queue.get(message.guild.id);
  if (!serverQueue) return message.channel.send("No songs to skip!");

  serverQueue.textChannel.send(`Skipped **${serverQueue.songs[0].title}**`);

  serverQueue.connection.dispatcher.end();
};

exports.play = play;
exports.stop = stop;
exports.skip = skip;
