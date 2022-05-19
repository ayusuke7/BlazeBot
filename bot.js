const { TelegramClient } = require("telegram");
const { NewMessage } = require("telegram/events");
const { StringSession } = require("telegram/sessions");

const fs = require("fs");
const blaze = require("./blaze");
const inquirer = require("inquirer");

const apiId = 9921280;
const blazeChannelId = 1676971024n;
const apiHash = "54a6de5b1ab28cb5cb231cfaa0efbe04";
const strSession =
  "1AQAOMTQ5LjE1NC4xNzUuNTUBuxcl/k9geBY8nzliKkZSKrRMIfE3ZvarVFUvEGpL4aqW/1PFhptohlXldV/LyBK4mmclpq8lzLL74qNrmvtRpJ5F1PJlCRpFcosq0hkAKMufDs3SZ5v9cvhEl4SFZ+9Ocu9xYbBfCFUWFpoDS97As3w0O7Smrtj5rsoBYi496RJalg7+NGp//vf7VmFbY1k4w6WwaWa0PZqxfvVmtuZAOq84rbTwMospD/0Ie/7+TzZPc0hCTJnSBbOtyVzuVHnZoKTiivRVO8d8X0vMPuC8d+MRnYUvtzR36Y/rOSivtAzv0P654/i4J0cM7MLoYisDwADD5ihAvjA908yPgGvREpQ=";

const date = new Date();
const session = new StringSession(strSession);
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

const fileStream = fs.createWriteStream("messages.txt", { flags: "a" });

let balance;
let amount;
let color;

let isBet = false;
let isGale = false;

let countBet = 0;
let limitBet = 5;
let percentage = 0.05;

const sendMessageForMe = (type) => {
  let message = `BOT: ${type}\n\n`;

  message += `[WALLET] ----- R$ ${balance.toPrecision(4)}\n`;
  message += `[AMOUNT] ----- R$ ${amount.toPrecision(3)}`;

  return client.sendMessage("me", { message });
};

const finishBot = (message) => {
  if (message) console.log(`[BOT STOP] ${message}`);

  fileStream.end();
  process.exit(1);
};

const checkColorFromGreen = (message, colorName) => {
  const { icon } = blaze.COLORS.find((c) => c.name === colorName);
  const colors = message.split(" ").filter((m) => blaze.ICONS.includes(m));
  const green = colors[colors.length - 1] || "";
  const win = icon === green ? "✅" : "⛔️";
  console.log("[GREEN]", { win, green, colors });

  return icon === green;
};

const updateBalanceFromApi = async () => {
  const wallet = await blaze.getWallet();

  if (wallet) {
    balance = parseFloat(wallet.balance);
    amount = Math.floor(balance * percentage);

    console.log(`[WALLET] ----- R$ ${balance.toPrecision(4)}`);
    console.log(`[AMOUNT] ----- R$ ${amount.toPrecision(3)}`);
  }

  if (amount < 2) finishBot("Amount minímo");
};

const extractColorFromMessage = (message) => {
  const msgs = message.split("\n");
  console.log(msgs);

  const enter = msgs.length > 0 ? msgs[1].split(" ").reverse()[0] : null;

  return enter;
};

const doCheckTypeForBetGaleLoss = async (message) => {
  const msgUpper = message.toUpperCase();

  if (msgUpper.includes("ENTRADA CONFIRMADA")) {
    color = extractColorFromMessage(message);
    if (!color) return;

    // Realizando aposta
    console.log(`[BET] Realizando aposta de R$ ${amount} em ${color}`);
    console.log(`[WALLET] R$ ${balance}`);
    const status = await blaze.executeBet(amount, color);
    if (status) {
      balance -= amount; //Atualiza o saldo subtraindo o valor apostado
      isBet = true;
    } else {
      isBet = false;
    }
  } else if (isBet && msgUpper.includes("GREEN")) {
    const green = checkColorFromGreen(message, color);
    color = null;
    isBet = false;

    if (green) countBet += 1;

    await updateBalanceFromApi();
    sendMessageForMe(green ? "GREEN ✅✅✅" : "BRANCO ⚪⚪⚪");
  } else if (isBet && msgUpper.includes("GALE")) {
    amount = amount * 2; // Dobra o valor da aposta

    // Refazendo a aposta dobrando o valor
    console.log(`[GALE] Refazendo aposta com R$ ${amount} em ${color}`);
    console.log(`[WALLET] R$ ${balance}`);

    const status = await blaze.executeBet(amount, color, true);

    if (status) {
      balance -= amount;
      isBet = true;
    } else {
      await updateBalanceFromApi();
    }
  } else if (isBet && msgUpper.includes("LOSS")) {
    console.log(`[LOSS] wallet: R$ ${balance}`);
    await updateBalanceFromApi();
    sendMessageForMe("LOSS ⛔️⛔️⛔️");
    finishBot();
  } else {
    console.log(`[MESSAGE] ${message}`);
  }
};

const eventHandleMessageFromBlazeChannel = async (e) => {
  const { peerId, message } = e.message;

  if (peerId?.channelId?.value === blazeChannelId) {
    // Do check type message for bet or gale or loss
    doCheckTypeForBetGaleLoss(message);

    // Write messages receives
    const lineBreak = "\n------------------------------\n";
    fileStream.write(`${date.toJSON()}\n${message} ${lineBreak}`);
  }
};

const run = async () => {
  console.log(`Conectando TELEGRAM`);

  await client.connect();

  console.log(`Iniciando BOT ⚫️🔴⚪✅💰⛔️`);

  await updateBalanceFromApi();

  client.addEventHandler(
    eventHandleMessageFromBlazeChannel,
    new NewMessage({})
  );
};

(async () => {
  const { option } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Run Bot Blazer",
      choices: [
        new inquirer.Separator(" = Opções = "),
        {
          name: "RUN BOT",
          value: 1,
        },
        {
          name: "SHOW WALLET",
          value: 2,
        },
        {
          name: "CHECK STATUS",
          value: 3,
        },
      ],
    },
  ]);

  switch (option) {
    case 1:
      run();
      break;
    case 2:
      const wall = await blaze.getWallet();
      console.log(wall);
      break;
    case 3:
      setInterval(async () => {
        const status = await blaze.getStatusRoulette();
        console.log(status);
      }, 1000);
      break;
    default:
      break;
  }
})();
