import { getClient, MetaTransaction, SignRequestData } from "near-safe";
import { ParsedQuoteRequest } from "./parse";
import { Address, erc20Abi, getAddress, encodeFunctionData } from "viem";
import {
  getNativeAsset,
  signRequestFor,
  wrapMetaTransaction,
} from "@bitte-ai/agent-sdk";
import { getQuote, Token as QuoteToken, QuoteResult } from "./quote";
import { Token as SDKToken, CurrencyAmount, Percent, TradeType } from "@uniswap/sdk-core";
import { isNativeAsset, sellTokenApprovalTx } from "../util";
import { QuoteParams } from "./parse";
import { AlphaRouter, SwapType, SwapOptionsSwapRouter02, SwapRoute } from "@uniswap/smart-order-router";
import { ANKR_API_ENDPOINT } from "../../config";

// Convert SDK Token to Quote Token interface
const adaptToken = (token: SDKToken): QuoteToken => ({
  chainId: token.chainId,
  address: token.address,
  decimals: token.decimals,
  symbol: token.symbol || "",
  name: token.name || "",
});

// https://docs.uniswap.org/sdk/v3/guides/swaps/routing
export async function orderRequestFlow({
  chainId,
  quoteRequest,
}: ParsedQuoteRequest): Promise<{
  transaction: SignRequestData;
  meta: { orderData: string };
}> {
  console.log("Quote Request", quoteRequest);
  const metaTransactions: MetaTransaction[] = [];

  // Handle native ETH wrapping if needed
  let sellTokenAddress = quoteRequest.sellToken;
  if (isNativeAsset(sellTokenAddress)) {
    metaTransactions.push(
      wrapMetaTransaction(chainId, BigInt(quoteRequest.amount)),
    );
    sellTokenAddress = getNativeAsset(chainId).address;
  }

  const [sellToken, buyToken] = await Promise.all([
    getToken(chainId, sellTokenAddress),
    getToken(chainId, quoteRequest.buyToken),
  ]);

  console.log(`Seeking Route for ${sellToken.symbol} --> ${buyToken.symbol}`);

  // Get the quote for the swap
  const route = await getQuote(
    chainId,
    BigInt(quoteRequest.amount),
    adaptToken(sellToken),
    adaptToken(buyToken),
    quoteRequest.walletAddress,
  );

  if (!route) {
    const message = `Failed to get route on ${chainId} for quoteRequest`;
    console.error(message);
    throw new Error(message);
  }

  console.log("Route found!", route);

  // Check if approval is needed for ERC20 tokens
  const approvalTx = await sellTokenApprovalTx({
    fromTokenAddress: sellToken.address,
    chainId,
    from: quoteRequest.walletAddress,
    spender: getSwapRouterAddress(chainId),
    sellAmount: quoteRequest.amount.toString(),
  });

  if (approvalTx) {
    console.log("Prepending approval transaction");
    metaTransactions.push(approvalTx);
  }

  // Build the swap transaction using Uniswap SDK
  const swapParams = buildSwapParams(route, sellToken, buyToken, quoteRequest);
  console.log("Swap parameters:", swapParams);

  // Encode the swap method call
  const swapTx = {
    to: getSwapRouterAddress(chainId),
    data: swapParams.calldata,
    value: swapParams.value || "0",
  };

  console.log("Swap transaction:", JSON.stringify(swapTx, null, 2));
  metaTransactions.push(swapTx);

  return {
    transaction: signRequestFor({
      chainId,
      from: getAddress(quoteRequest.walletAddress),
      metaTransactions,
    }),
    meta: { orderData: JSON.stringify(route) },
  };
}

/**
 * Build the swap parameters for Uniswap router
 */
function buildSwapParams(
  route: QuoteResult,
  sellToken: SDKToken,
  buyToken: SDKToken,
  quoteRequest: QuoteParams
): { calldata: string; value?: string } {
  // Define swap parameters
  const recipient = quoteRequest.walletAddress;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
  const slippageTolerance = 0.5; // 0.5% slippage tolerance

  // Calculate minimum amount out with slippage
  const amountOutMin = BigInt(Math.floor(Number(route.quote) * (1 - slippageTolerance / 100)));

  // Check if we're selling ETH (native asset)
  const isSellingEth = isNativeAsset(quoteRequest.sellToken);

  // For exactInputSingle - the most common swap type
  // Interface for SwapRouter.exactInputSingle
  const routerAbi = [
    {
      inputs: [
        {
          components: [
            { name: "tokenIn", type: "address" },
            { name: "tokenOut", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "recipient", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMinimum", type: "uint256" },
            { name: "sqrtPriceLimitX96", type: "uint160" },
          ],
          name: "params",
          type: "tuple",
        },
      ],
      name: "exactInputSingle",
      outputs: [{ name: "amountOut", type: "uint256" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            { name: "tokenIn", type: "address" },
            { name: "tokenOut", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "recipient", type: "address" },
            { name: "deadline", type: "uint256" },
            { name: "amountIn", type: "uint256" },
            { name: "amountOutMinimum", type: "uint256" },
            { name: "sqrtPriceLimitX96", type: "uint160" },
          ],
          name: "params",
          type: "tuple",
        },
      ],
      name: "exactInputSingle",
      outputs: [{ name: "amountOut", type: "uint256" }],
      stateMutability: "payable",
      type: "function",
    },
  ];

  // Try to find the most appropriate pool fee
  const fee = 3000; // Default 0.3% fee tier

  // Create the parameters for the swap
  const params = {
    tokenIn: sellToken.address,
    tokenOut: buyToken.address,
    fee: fee,
    recipient: recipient,
    deadline: deadline,
    amountIn: quoteRequest.amount,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0, // 0 for no price limit
  };

  // Encode the function call
  try {
    const calldata = encodeFunctionData({
      abi: routerAbi,
      functionName: "exactInputSingle",
      args: [params],
    });

    return {
      calldata,
      value: isSellingEth ? quoteRequest.amount.toString() : "0",
    };
  } catch (error) {
    console.error("Error encoding swap function:", error);
    throw new Error("Failed to encode swap transaction");
  }
}

export async function getToken(
  chainId: number,
  address: Address,
): Promise<SDKToken> {
  const client = getClient(chainId);
  const [decimals, symbol, name] = await Promise.all([
    client.readContract({
      abi: erc20Abi,
      address,
      functionName: "decimals",
    }),
    client.readContract({
      abi: erc20Abi,
      address,
      functionName: "symbol",
    }),
    client.readContract({
      abi: erc20Abi,
      address,
      functionName: "name",
    }),
  ]);
  return new SDKToken(chainId, address, decimals, symbol, name);
}

const swapRouterOverrides: Map<number, string> = new Map([
  [8453, "0x2626664c2603336E57B271c5C0b26F421741e481"], // Base
  [56, "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2"], // BNB Chain
  [43114, "0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE"], // Avalanche C-Chain
  [42220, "0x5615CDAb10dc425a742d643d949a7F474C01abc4"], // Celo
  [81457, "0x549FEB8c9bd4c12Ad2AB27022dA12492aC452B66"], // Blast
]);

function getSwapRouterAddress(chainId: number): Address {
  // https://docs.uniswap.org/contracts/v3/reference/deployments/
  const defaultSwapRouter = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
  return getAddress(swapRouterOverrides.get(chainId) || defaultSwapRouter);
}
