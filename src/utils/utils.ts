import { Address, erc20Abi, parseUnits } from "viem";
import { Token } from "./types/interface";
import Tokens from "../pages/tokenList.json";

export function convertToBigInt(
  amount: number | string,
  decimals: number,
): bigint {
  if (amount === undefined || amount === null || amount === "") return 0n;

  const parsedDecimals = Number(decimals);
  if (!Number.isFinite(parsedDecimals) || parsedDecimals < 0) return 0n;

  const raw = typeof amount === "number" ? amount.toString() : amount.trim();
  if (!raw || raw === "." || raw === "-" || raw === "-.") return 0n;

  const numericValue = Number(raw);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0n;

  let safe = raw;
  const dotIndex = safe.indexOf(".");
  if (dotIndex !== -1) {
    const fractionalDigits = safe.length - dotIndex - 1;
    if (fractionalDigits > parsedDecimals) {
      safe = safe.slice(0, dotIndex + 1 + parsedDecimals);
    }
  }

  try {
    return parseUnits(safe, parsedDecimals);
  } catch {
    return 0n;
  }
}

// export function buildBalanceCheckParams(_tokens: Token[], address: Address) {
//   let readContractArray = [];
//   for (let i = 0; i < _tokens.length; i++) {
//     if (_tokens[i].address) {
//       readContractArray.push({
//         address: _tokens[i].address,
//         abi: erc20Abi,
//         functionName: "balanceOf",
//         args: [address!],
//       });
//     }
//   }
//   return readContractArray;
// }

export function formatFloat(value: number) {
  if (!value) {
    return value;
  }
  if (typeof value !== "number") {
    return value;
  }

  const valueString = value.toString();
  const decimalIndex = valueString.indexOf(".");

  if (decimalIndex === -1) {
    return value;
  }

  const decimalPart = valueString.slice(decimalIndex + 1);
  if (decimalPart.length > 6) {
    return parseFloat(value.toFixed(6));
  }

  return value;
}

export function getTokenInfoByAddress(address: string):
  | {
      name: string;
      decimal: string;
      icon: string;
      ticker: string;
      address: string;
    }
  | undefined {
  // console.log(address);
  if (!address) {
    return undefined;
  }

  // first let check if token is already in localStorage
  const storedTokens = JSON.parse(
    localStorage.getItem("importedTokens") || "[]"
  );
  const importedToken = storedTokens.find(
    (token: Token) => token.address.toLowerCase() === address.toLowerCase()
  );
  if (importedToken) {
    return {
      name: importedToken.name,
      address: importedToken.address,
      decimal: importedToken.decimal,
      icon: importedToken.image,
      ticker: importedToken.ticker,
    };
  }

  //  if not in the local storage let now check if token exists in tokens.json
  const token = Tokens.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
  if (token) {
    return {
      name: token.name,
      decimal: token.decimal!,
      icon: token.image,
      ticker: token.ticker,
    };
  }
  return undefined;
}

export const formatErrorMessage = (error: any, defaultMessage: string) => {
  if (error && typeof error.message === 'string') {
    // Check for common user-rejected error
    if (error.message.includes("User rejected the request")) {
      return "Transaction rejected by user.";
    }
    // Truncate long messages
    const maxLength = 100; // Max length for the displayed message
    if (error.message.length > maxLength) {
      return `${error.message.substring(0, maxLength)}...`;
    }
    return error.message;
  }
  return defaultMessage;
};

// export function getTokenInfoByAdapters(
//   address: string
// ): { name: string; icon: string } | undefined {
//   console.log(address);
//   if (!address) {
//     return undefined;
//   }
//   const token = Adapters.find(
//     (token) => token.address.toLowerCase() === address.toLowerCase()
//   );
//   if (token) {
//     return {
//       name: token.name,
//       icon: token.icon,
//     };
//   } else {
//     return undefined;
//   }
// }
