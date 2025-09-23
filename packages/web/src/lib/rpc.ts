"use client";

import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { PriceFeedService } from "../gen/pricefeed/v1/pricefeed_connect";

const transport = createConnectTransport({
  baseUrl: "http://localhost:4000"
});

export const rpc = createPromiseClient(PriceFeedService, transport);
