var player = require("play-sound")((opts = {}));

const play = () => {
  player.play("sound.mp3", function (err) {
    if (err) console.log("[AUDIO] Erro executar audio");
  });
};

play();

module.exports = { play };
