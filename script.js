// connect to Moralis server
const serverUrl = "https://9vopybgxlvw2.usemoralis.com:2053/server";
const appId = "xrNxnZrASuoqmWSeRfOdmZwuzaudFsclbNt86Xob";
Moralis.start({ serverUrl, appId });

const tokenValue = (value, decimals) => (decimals ? value / Math.pow(10, decimals): value);

async function getStats() {
  const balances = await Moralis.Web3API.account.getTokenBalances();
  tokenBalanceBody.innerHTML = balances.map((token, index) => `
    <tr>
    <td>${index + 1}</td>
    <td>${token.symbol}</td>
    <td>${token.amount}</td>
    <td>${tokenValue(token.balance, token.decimals)}</td>
    <td><button>Swap</button></td>
    </tr>
  `).join("");
}


const tokenBalanceBody = document.querySelector("#token-balances")
async function login() {
  let user = Moralis.User.current();
  if (!user) {
    user = await Moralis.authenticate();
  }
  console.log("logged in user:", user);
  getStats();
}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
}

document.getElementById("btn-login").onclick = login;
document.getElementById("btn-logout").onclick = logOut;

async function getTopTenTokens() {
  const res = await fetch("https://api.coinpaprika.com/v1/coins");
  const tokens = await res.json();

  return tokens
    .filter((token) => token.rank >= 1 && token.rank <= 50)
    .map((token) => token.symbol);
}

async function getTokens(tokenList) {
  const res = await fetch("https://api.1inch.io/v4.0/1/tokens");
  const tokens = await res.json();
  const tokenObject = Object.values(tokens.tokens);
  return tokenObject.filter((token) => tokenList.includes(token.symbol));
}

function renderForm(tokens) {
  const options = tokens.map(
    (token) =>
      `<option value="${token.decimals}-${token.address}">${token.name} (${token.symbol})</option>`
  );
  document.querySelector("#from-token").innerHTML = options;
  document.querySelector("#to-token").innerHTML = options;
  document.querySelector("#submit-button").removeAttribute("disabled");
}

getTopTenTokens().then(getTokens).then(renderForm);

async function formSubmit(event) {
  event.preventDefault();
  let [fromDecimals, fromAddress] = document
    .querySelector("#from-token")
    .value.split("-");
  const [toDecimals, toAddress] = document
    .querySelector("#to-token")
    .value.split("-");
  const fromUnit = 10 ** fromDecimals;
  const decimalRatio = 10 ** (fromDecimals - toDecimals);

  try {
    const res = await fetch(
      `https://api.1inch.io/v4.0/1/quote?fromTokenAddress=${fromAddress}&toTokenAddress=${toAddress}&amount=${fromUnit}`
    );
    const quote = await res.json();

    const exchangeRate =
      (Number(quote.toTokenAmount) / Number(quote.fromTokenAmount)) *
      decimalRatio;
    document.querySelector(
      "#quote-container"
    ).innerHTML = `<h3>1 ${quote.fromToken.symbol} = ${exchangeRate} ${quote.toToken.symbol}</h3>\n<p>Estimated Gas:${quote.estimatedGas}</p>`;
  } catch (error) {
    document.querySelector(
      "#quote-container"
    ).innerHTML = `<h3>Error, please try again.</h3>`;
  }
}

const submitButton = document.querySelector("#submit-button");
submitButton.addEventListener("click", formSubmit);
