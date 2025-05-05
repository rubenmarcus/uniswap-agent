import { orderRequestFlow } from "../tools/uniswap/orderFlow";
import {
  // getSafeSaltNonce,
  getTokenMap,
  // getZerionKey,
  // validateExpressRequest,
} from "../tools/util";
import { parseQuoteRequest } from "../tools/uniswap/parse";
import { Router, Request, Response, NextFunction } from "express";
import { handleRequest, TxData } from "../types/agent-sdk";

const router = Router();

async function logic(req: Request): Promise<TxData> {
  const parsedRequest = await parseQuoteRequest(
    req,
    await getTokenMap(),
  );
  console.log("POST Request for quote:", parsedRequest);
  return orderRequestFlow(parsedRequest);
}

router.post("/", (req: Request, res: Response, next: NextFunction) => {
  handleRequest(req, logic, (x: TxData) => res.status(200).json(x)).catch(next);
});

export { router as uniswapRouter };
