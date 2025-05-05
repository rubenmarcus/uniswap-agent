import { Address, getAddress, parseUnits } from "viem";
import {
  TokenInfo,
  TokenBalance,
  BlockchainMapping,
} from "../../types/agent-sdk";
import { NATIVE_ASSET } from "../util";
import { Network } from "near-safe";
import { getSafeBalances, getTokenDetails } from "../safe";

export type QuoteParams = {
  sellToken: Address;
  buyToken: Address;
  amount: bigint;
  walletAddress: Address;
};

export interface ParsedQuoteRequest {
  quoteRequest: QuoteParams;
  chainId: number;
}

type QuoteRequestBody = {
  sellToken: string;
  buyToken: string;
  chainId: number;
  sellAmountBeforeFee: string;
  safeAddress: Address;
};

// Define a looser request type
type LooseRequest = {
  body: QuoteRequestBody;
};

export async function parseQuoteRequest(
  req: LooseRequest,
  tokenMap: BlockchainMapping,
): Promise<ParsedQuoteRequest> {
  // TODO - Add Type Guard on Request (to determine better if it needs processing below.)
  const requestBody = req.body;
  console.log("Raw Request Body:", requestBody);
  // TODO: Validate input with new validation tools:
  const {
    sellToken,
    buyToken,
    chainId,
    sellAmountBeforeFee: sellAmount,
    safeAddress: sender,
  } = requestBody;
  console.log(
    `TokenMap for ${chainId} has ${Object.keys(tokenMap[chainId]).length} entries`,
  );
  if (sellAmount === "0") {
    throw new Error("Sell amount cannot be 0");
  }

  const [balances, buyTokenData] = await Promise.all([
    getSafeBalances(chainId, sender),
    getTokenDetails(chainId, buyToken, tokenMap),
  ]);
  const sellTokenData = sellTokenAvailable(chainId, balances, sellToken);
  if (!buyTokenData) {
    throw new Error(
      `Buy Token not found '${buyToken}': supply address if known`,
    );
  }
  return {
    chainId,
    quoteRequest: {
      sellToken: sellTokenData.address as Address,
      buyToken: buyTokenData.address as Address,
      amount: parseUnits(sellAmount, sellTokenData.decimals),
      walletAddress: sender,
    },
  };
}

function sellTokenAvailable(
  chainId: number,
  balances: TokenBalance[],
  sellTokenSymbolOrAddress: string,
): TokenInfo {
  let balance: TokenBalance | undefined;
  if (isAddress(sellTokenSymbolOrAddress, { strict: false })) {
    balance = balances.find(
      (b) =>
        getAddress(b.tokenAddress || NATIVE_ASSET) ===
        getAddress(sellTokenSymbolOrAddress),
    );
  } else {
    balance = balances.find(
      (b) =>
        b.token?.symbol.toLowerCase() ===
        sellTokenSymbolOrAddress.toLowerCase(),
    );
  }
  if (balance) {
    return {
      address: getAddress(balance.tokenAddress || NATIVE_ASSET),
      decimals: balance.token?.decimals || 18,
      symbol: balance.token?.symbol || "UNKNOWN",
    };
  }
  throw new Error(
    `Sell token (${sellTokenSymbolOrAddress}) not found in balances: ${balances.map((b) => b.token?.symbol || nativeAssetSymbol(chainId)).join(",")}`,
  );
}

function nativeAssetSymbol(chainId: number): string {
  return Network.fromChainId(chainId).nativeCurrency.symbol;
}

// Helper function to check if a string is an address (moved from Zerion's implementation)
function isAddress(value: string, options?: { strict: boolean }): boolean {
  try {
    return value.startsWith('0x') && (options?.strict === false || value.length === 42);
  } catch {
    return false;
  }
}
