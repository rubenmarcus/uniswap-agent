import {
  addressField,
  FieldParser,
  handleRequest,
  numberField,
  validateInput,
  TokenBalance,
} from "../types/agent-sdk";
import { Address } from "viem";
import { Router, Request, Response, NextFunction } from "express";

// Import our ANKR implementation instead of Zerion
import { getSafeBalances } from "../tools/safe";

interface Input {
  chainId: number;
  safeAddress: Address;
}

const parsers: FieldParser<Input> = {
  chainId: numberField,
  safeAddress: addressField,
};

async function logic(req: Request): Promise<TokenBalance[]> {
  // Prevent unauthorized spam for balance API.
  const search = new URLSearchParams(
    Object.entries(req.query).map(([k, v]) => [k, v as string]),
  );
  console.log("Request: balances/", search);
  const { chainId, safeAddress } = validateInput<Input>(search, parsers);
  // No need for Zerion API key with ANKR
  const balances = await getSafeBalances(chainId, safeAddress);
  console.log(`Retrieved ${balances.length} balances for ${safeAddress}`);
  return balances;
}

const router = Router();

router.get("/", (req: Request, res: Response, next: NextFunction) => {
  handleRequest(req, logic, (x: TokenBalance[]) => res.status(200).json(x)).catch(next);
});

export { router as balancesRouter };
