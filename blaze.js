const fs = require("fs");
const axios = require("axios").default;

let token;
let baseUrl = "https://blaze.com/api";

const date = new Date();
const ICONS = ["⚪", "🔴", "⚫️"];
const COLORS = [
  { icon: ICONS[0], name: "Branco", number: 0 },
  { icon: ICONS[1], name: "Vermelho", number: 1 },
  { icon: ICONS[2], name: "Preto", number: 2 },
];

const api = axios.create({});
api.interceptors.request.use(async (config) => {
  if (token == null && !config.url.includes("/password")) {
    await login();
  }

  config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

const createLog = (log) => {
  const data = JSON.stringify({
    date: date.toJSON(),
    log,
  }).concat("\n");

  fs.appendFileSync("log.txt", data);
};

const login = async () => {
  if (fs.existsSync("token.txt")) {
    token = fs.readFileSync("token.txt", { encoding: "utf-8" });
    token;
  } else {
    console.log("Fazendo Login ------------");
    try {
      const { data } = await api.put(`${baseUrl}/auth/password`, {
        username: "alexhcb.7392@gmail.com",
        password: "Aa07031992*",
      });

      token = data["access_token"];

      fs.writeFileSync("token.txt", token, {
        encoding: "utf8",
        flag: "w",
      });
    } catch (error) {
      console.log("Error ao fazer login");
      createLog(error);
    }
  }
};

const getStatsBets = async () => {
  try {
    const { data } = await api.get(`${baseUrl}/roulette_games/current`);
    const bets = data?.bets || [];

    const group = bets.reduce((acum, item) => {
      const key = ICONS[item.color];
      const obj = acum[key] ?? { sum: 0, amount: 0 };
      obj.sum = obj.sum + 1;
      obj.amount = obj.amount + item.amount;
      obj.media = (obj.amount / obj.sum).toPrecision(4);
      acum[key] = obj;
      return acum;
    }, {});

    return {
      total: bets.length,
      bets: group,
    };
  } catch (error) {
    console.log("Erro ao Buscar Status");
  }
};

const getStatusRoulette = async () => {
  try {
    const { data } = await api.get(`${baseUrl}/roulette_games/current`);
    const res = {
      status: data.status,
      color: data.color,
    };
    if (res.color != null) {
      res.color = COLORS.find((c) => c.number == res.color);
    }
    return res;
  } catch (error) {
    console.log("Erro ao Buscar Status");
  }
};

const getMe = async () => {
  try {
    const { data } = await api.get(`${baseUrl}/users/me`);
    return data;
  } catch (error) {
    console.log(error);
  }
};

const getWallet = async () => {
  try {
    const { data } = await api.get(`${baseUrl}/wallets`);
    return data[0];
  } catch (error) {
    console.log("Error ao buscar Wallet");
    createLog(error);
  }
};

const protectWhite = async (amount) => {
  let value = "2.00";

  if (amount) {
    value = amount.toPrecision(amount >= 10 ? 4 : 3);
  }

  try {
    console.log("[PROTEGENDO O BRANCO]", value);
    await api.post(`${baseUrl}/roulette_bets`, {
      color: 0,
      amount: value,
      free_bet: false,
      wallet_id: 29206686,
      currency_type: "BRL",
    });
  } catch (error) {
    console.log("[ERROR] Erro ao proteger o Branco");
    createLog(error);
  }
};

const sendRouleteBet = async (amount, color) => {
  const { number } = COLORS.find((c) => c.name == color);

  const payload = {
    color: number,
    amount: amount.toPrecision(amount >= 10 ? 4 : 3),
    currency_type: "BRL",
    free_bet: false,
    wallet_id: 29206686,
  };

  try {
    await api.post(`${baseUrl}/roulette_bets`, payload);
    console.log("APOSTA ENVIADA", payload.amount, color);
  } catch (error) {
    console.log("[ERROR] Erro ao realizar Aposta");
    createLog(error);
  }
};

const executeBet = async (amount, color, isGale = false) => {
  console.log("[ENVIANDO APOSTA] ", { amount, color });
  const res = await getStatusRoulette();

  if (res && res.status === "waiting") {
    // Faz aposta protegendo o branco
    //if (isGale) await protectWhite();
    await sendRouleteBet(amount, color);
    return res;
  } else if (isGale || res?.status === "complete") {
    return executeBet(amount, color, isGale);
  } else {
    console.log("[STATUS] Não foi possivel enviar Aposta: ", {
      status: res.status,
    });
  }
};

/* executeBet(3, "Preto", true).then((res) => {
  console.log("res", res);
}); */

module.exports = {
  executeBet,
  getWallet,
  getMe,
  getStatusRoulette,
  protectWhite,
  getStatsBets,
  ICONS,
  COLORS,
};
