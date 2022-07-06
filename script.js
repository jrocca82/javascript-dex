// connect to Moralis server
const serverUrl = "https://9vopybgxlvw2.usemoralis.com:2053/server";
const appId = "xrNxnZrASuoqmWSeRfOdmZwuzaudFsclbNt86Xob";
Moralis.start({ serverUrl, appId });
Moralis.initPlugins();

//token helper
const tokenValue = (value, decimals) =>
  decimals ? value / Math.pow(10, decimals) : value;

//Get HTMl components
const tokenBalanceBody = document.querySelector("#token-balances");
const selectedToken = document.querySelector(".from-token");
const amountInput = document.querySelector(".from-amount");
const toToken = document.querySelector("#to-token");
const quoteContainer = document.querySelector("#quote-container");
const quoteButton = document.querySelector("#quote-button");
const confirmSwapButton = document.querySelector("#confirm-swap");
const cancelButton = document.querySelector("#cancel");
tokenBalanceBody.innerHTML = `<tr><td class="error">Please connect to metamask to continue.</td></tr>`;

//Functions
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

const buyCrypto = () => {
  Moralis.Plugins.fiat.buy();
};

//Get user metamask balances
async function getStats() {
  const balances = await Moralis.Web3API.account.getTokenBalances();
  console.log(balances, "balances");
  if (balances.length === 0) {
    return (tokenBalanceBody.innerHTML = `<tr><td class="error">You have no tokens! Please buy some crypto to continue.</td></tr>`);
  }
  console.log("Should not reach");
  tokenBalanceBody.innerHTML = balances
    .map(
      (token, index) => `
    <tr>
    <td>${index + 1}</td>
    <td>${token.symbol}</td>
    <td>${tokenValue(token.balance, token.decimals)}</td>
    <td><button 
          class="swap-button" 
          data-address="${token.token_address}" 
          data-symbol="${token.symbol}" 
          data-decimals="${token.decimals}" 
          data-max="${tokenValue(
            token.balance,
            token.decimals
          )}">Swap</button></td>
    </tr>
  `
    )
    .join("");

  for (let button of tokenBalanceBody.querySelectorAll(".swap-button")) {
    button.addEventListener("click", initSwapForm);
  }
}

async function initSwapForm(event) {
  event.preventDefault();
  selectedToken.innerText = event.target.dataset.symbol;
  selectedToken.dataset.address = event.target.dataset.address;
  selectedToken.dataset.decimals = event.target.dataset.decimals;
  selectedToken.dataset.max = event.target.dataset.max;
  amountInput.removeAttribute("disabled");
  amountInput.value = "";
  quoteButton.removeAttribute("disabled");
  confirmSwapButton.removeAttribute("disabled");
  cancelButton.removeAttribute("disabled");
  quoteContainer.innerHTML = "";
}

//Create dropdown list
async function getTopTenTokens() {
  const res = await fetch("https://api.coinpaprika.com/v1/coins");
  const tokens = await res.json();

  return tokens
    .filter((token) => token.rank >= 1 && token.rank <= 50)
    .map((token) => token.symbol);
}

async function getTokens(tokenList) {
  const tokens = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: "eth",
  });
  const tokenObject = Object.values(tokens.tokens);
  const tokenSymbols = tokenObject.filter((token) =>
    tokenList.includes(token.symbol)
  );
  return tokenSymbols;
}

function renderTokenDropDown(tokens) {
  const options = tokens.map(
    (token) =>
      `<option value="${token.address}">${token.name} (${token.symbol})</option>`
  );
  toToken.innerHTML = options;
}

//global variables for quotes and swap
const fromAmount = Number.parseFloat(amountInput.value);
const fromMaxValue = Number.parseFloat(selectedToken.dataset.max);
const toAddress = toToken.value;
const fromDecimals = selectedToken.dataset.decimals;
const fromAddress = selectedToken.dataset.address;
//get quotes
async function quoteFormSubmit(event) {
  event.preventDefault();

  if (fromAmount > fromMaxValue) {
    quoteContainer.innerHTML = `<h3 class="error">Not enough tokens.</h3>`;
    return;
  } else {
    quoteContainer.innerHTML = "";
  }

  if (Number.isNaN(fromAmount)) {
    quoteContainer.innerHTML = `<h3 class="error">You did not enter a number. Please try again.</h3>`;
    return;
  } else {
    quoteContainer.innerHTML = "";
  }

  try {
    const quote = await Moralis.Plugins.oneInch.quote({
      chain: "eth",
      fromAddress, // The token you want to swap
      toAddress, // The token you want to receive
      amount: Moralis.Units.token(fromAmount, fromDecimals).toString(),
    });
    const toAmount = tokenValue(quote.toTokenAmount, quote.decimals);
    quoteContainer.innerHTML = `<p>1 ${fromAmount} ${quote.fromToken.symbol} = ${toAmount} ${quote.toAmount.symbol}</p>\n<p>Estimated Gas:${quote.estimatedGas}</p>`;
  } catch (error) {
    document.querySelector(
      ".error"
    ).innerHTML = `<h3>Error, please try again.</h3>`;
  }
}

//Confirm Swap
async function confirmSwap(event) {
  event.preventDefault();
    const receipt = await Moralis.Plugins.oneInch.swap({
      chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
      fromAddress, // The token you want to swap
      toAddress, // The token you want to receive
      amount: Moralis.Units.token(fromAmount, fromDecimals).toString(),
      fromAddress: Moralis.user.current().get("ethAddress"), // Your wallet address
      slippage: 1,
    });
}

//Cancel
async function formCancel(event) {
  event.preventDefault();
  amountInput.setAttribute("disabled", "");
  amountInput.value = "";
  quoteButton.setAttribute("disabled", "");
  confirmSwapButton.setAttribute("disabled", "");
  cancelButton.setAttribute("disabled", "");
  quoteContainer.innerHTML = "";
  delete selectedToken.dataset.address;
  delete selectedToken.dataset.decimals;
  delete selectedToken.dataset.max;
}

//Event listeners
quoteButton.addEventListener("click", quoteFormSubmit);
confirmSwapButton.addEventListener("click", confirmSwap);
cancelButton.addEventListener("clicl", formCancel);
document.querySelector("#btn-login").addEventListener("click", login);
document.querySelector("#btn-logout").addEventListener("click", logOut);
document.querySelector("#buy-crypto").addEventListener("click", buyCrypto);

//Run script
getTopTenTokens().then(getTokens).then(renderTokenDropDown);
