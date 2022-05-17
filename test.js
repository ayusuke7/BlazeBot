const fs = require("fs");

(async () => {
  const file = fs.readFileSync("messages.txt", { encoding: "utf-8" });

  const messages = file
    .split("------------------------------")
    .map((m) => m.substring(m.indexOf("\n") + 1));

  const tick = (message) => {
    return new Promise((resolve) =>
      setTimeout(() => {
        console.log(message);
        return resolve(message);
      }, 2000)
    );
  };

  const date = new Date();

  for (var message of messages) {
    await tick(message);

    const diff = new Date().getSeconds() - date.getSeconds();
    console.log(diff);
    if (diff >= 10) {
      process.exit(1);
    }
  }
})();
