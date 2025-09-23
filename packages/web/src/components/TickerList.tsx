"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rpc } from "../lib/rpc";
import { PriceUpdate } from "../gen/pricefeed/v1/pricefeed_pb";

type TickerState = {
  latest?: number;
  lastUpdated?: number;
  controller?: AbortController;
};

export default function TickerList() {
  const [input, setInput] = useState("");
  const [tickers, setTickers] = useState<string[]>([]);
  const [map, setMap] = useState<Map<string, TickerState>>(new Map());

  const sortedTickers = useMemo(() => [...tickers].sort((a, b) => a.localeCompare(b)), [tickers]);

  const addTicker = async (raw: string) => {
    const t = raw.trim().toUpperCase();
    if (!t) return;
    if (tickers.includes(t)) return;
    setTickers((prev) => [...prev, t]);

    const controller = new AbortController();
    const nextMap = new Map(map);
    nextMap.set(t, { controller });
    setMap(nextMap);

    console.log(`[web] Subscribing ${t}...`);
    (async () => {
      try {
        console.log(`[web] About to call rpc.subscribe for ${t}`);
        const stream = rpc.subscribe({ ticker: t, exchange: "BINANCE" }, { signal: controller.signal });
        
        for await (const msg of stream) {
          const up = msg as PriceUpdate;
          console.log(`[web] Received PriceUpdate for ${t}:`, msg);
          setMap((prev) => {
            const m = new Map(prev);
            const curr = m.get(t) ?? {};
            m.set(t, { ...curr, latest: up.price, lastUpdated: Number(up.tsUnixMs ?? Date.now()) });
            return m;
          });
          console.log(`[web] ${t} price`, msg.price);
        }
      } catch (e) {
        if ((e as any).name === "AbortError") {
          console.log(`[web] ${t} stream aborted`);
        } else {
          console.error(`[web] ${t} stream error`, e);
        }
      }
    })();
  };

  const removeTicker = (t: string) => {
    const st = map.get(t);
    st?.controller?.abort();
    setMap((prev) => {
      const m = new Map(prev);
      m.delete(t);
      return m;
    });
    setTickers((prev) => prev.filter((x) => x !== t));
    console.log(`[web] Removed ${t}`);
  };

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Project Pluto — Crypto Prices</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void addTicker(input);
          setInput("");
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add ticker (e.g., BTCUSD)"
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Add</button>
      </form>

      <p style={{ opacity: 0.7, marginTop: 8 }}>Exchange fixed to <b>BINANCE</b>. List is sorted A→Z.</p>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
        {sortedTickers.map((t) => {
          const st = map.get(t);
          return (
            <li key={t} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {st?.lastUpdated ? new Date(st.lastUpdated).toLocaleTimeString() : "—"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>
                  {st?.latest !== undefined ? st.latest : "…"}
                </div>
                <button onClick={() => removeTicker(t)} aria-label={`Remove ${t}`}>✕</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
