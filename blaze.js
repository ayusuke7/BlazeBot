const fs = require("fs");
const axios = require("axios").default;

let token;
let baseUrl = "https://blaze.com/api";
let countGale = 0;

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

const getStatusRoulette = async () => {
  try {
    const { data } = await api.get(`${baseUrl}/roulette_games/current`);
    const res = {
      color: data.color,
      status: data.status,
    };
    if (res.color != null) {
      res.color = COLORS.find((c) => c.number == res.color);
    }
    return res;
  } catch (error) {
    console.log("Erro ao Buscar Status");
    createlog(error);
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

const executeBet = async (amount, color, isGale = false) => {
  console.log("[ENVIANDO APOSTA] ", { amount, color });
  const res = await getStatusRoulette();

  if (res && res.status === "waiting") {
    const precision = amount >= 10 ? 4 : 3;
    try {
      const payload = {
        color: COLORS.find((c) => c.name == color).number,
        amount: amount.toPrecision(precision),
        currency_type: "BRL",
        free_bet: false,
        wallet_id: 29206686,
      };
      await api.post(`${baseUrl}/roulette_bets`, payload);
      console.log("[APOSTA ENVIADA] ", payload);
      return res;
    } catch (error) {
      console.log("[ERROR] Erro ao Realizar Aposta");
      createLog(error);
    }
  } else if (isGale) {
    return executeBet(amount, color, isGale);
  } else {
    console.log("[STATUS] Não foi possivel enviar Aposta: ", res.status);
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
  ICONS,
  COLORS,
};
