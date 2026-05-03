const axios = require("axios");

const etherscanClient = axios.create({
  baseURL: process.env.ETHERSCAN_BASE_URL || "https://api.etherscan.io/api",
  timeout: 10_000,
});

function isValidEthAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address || "");
}

async function fetchPortfolio(address) {
  if (!isValidEthAddress(address)) {
    throw new Error("Invalid wallet address format");
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return {
      address,
      holdings: [],
      totalUsd: 0,
      pnlUsd: 0,
      note: "ETHERSCAN_API_KEY not configured; returning empty portfolio",
    };
  }

  const [ethBalanceRes, tokenRes] = await Promise.all([
    etherscanClient.get("", {
      params: {
        module: "account",
        action: "balance",
        tag: "latest",
        address,
        apikey: apiKey,
      },
    }),
    etherscanClient.get("", {
      params: {
        module: "account",
        action: "tokentx",
        address,
        sort: "desc",
        page: 1,
        offset: 100,
        apikey: apiKey,
      },
    }),
  ]);

  const ethBalance = Number(ethBalanceRes.data?.result || 0) / 1e18;

  const uniqueTokens = new Map();
  for (const tx of tokenRes.data?.result || []) {
    const tokenSymbol = tx.tokenSymbol;
    if (!tokenSymbol || uniqueTokens.has(tokenSymbol)) continue;

    const decimals = Number(tx.tokenDecimal || 18);
    const quantity = Number(tx.value || 0) / 10 ** decimals;
    uniqueTokens.set(tokenSymbol, {
      symbol: tokenSymbol,
      quantity,
      priceUsd: 0,
      valueUsd: 0,
      pnlUsd: 0,
    });
  }

  const holdings = [
    {
      symbol: "ETH",
      quantity: ethBalance,
      priceUsd: 0,
      valueUsd: 0,
      pnlUsd: 0,
    },
    ...Array.from(uniqueTokens.values()),
  ];

  return {
    address,
    holdings,
    totalUsd: holdings.reduce((acc, h) => acc + h.valueUsd, 0),
    pnlUsd: holdings.reduce((acc, h) => acc + h.pnlUsd, 0),
  };
}

module.exports = {
  fetchPortfolio,
  isValidEthAddress,
};
