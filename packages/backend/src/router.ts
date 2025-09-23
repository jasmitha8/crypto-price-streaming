import { ConnectRouter } from "@connectrpc/connect";
import { Browser } from "playwright";
import { on } from "events";

import { PriceFeedService } from "./gen/pricefeed/v1/pricefeed_connect.js";
import { SubscribeRequest, PriceUpdate } from "./gen/pricefeed/v1/pricefeed_pb.js";
import { TickerManager } from "./tickers/manager.js";

export function createRouter(browser: Browser) {
  const manager = new TickerManager(browser);

  return (router: ConnectRouter) =>
    router.service(PriceFeedService, {
      subscribe: async function* (
        req: SubscribeRequest
      ): AsyncGenerator<PriceUpdate, void, unknown> {
        const ticker = req.ticker.trim().toUpperCase();
        const exchange = (req.exchange || "BINANCE").toUpperCase();

        console.log(`[rpc] Subscribe requested: ${exchange}:${ticker}`);

        const { emitter, release } = await manager.acquire(exchange, ticker);

        try {
          for await (const [update] of on(emitter, "price") as AsyncIterable<[PriceUpdate]>) {
            yield update;
          }
        } finally {
          console.log(`[rpc] Stream closed: ${exchange}:${ticker}`);
          release(); // <-- stop the loop when client disconnects
        }
      },
    });
}
