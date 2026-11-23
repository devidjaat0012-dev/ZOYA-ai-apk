// ============================================================================
// ZOYA PRO WEBSITE HOSTING & DOMAIN SYNTHESIS ENGINE
// Guarantees topic-accurate, interactive single-file production websites
// (including a full TradingView/Binance-grade Live Trading Terminal)
// ============================================================================

export const PRO_TRADING_WEBSITE_HTML = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TradeX Pro — Live Algorithmic Crypto, Nifty &amp; Forex Terminal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #060911; color: #e2e8f0; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    .font-display { font-family: 'Space Grotesk', sans-serif; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #0b101b; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
  </style>
</head>
<body class="min-h-screen bg-[#060911] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">

  <!-- Top Live Ticker Ribbon -->
  <div class="bg-[#090d16] border-b border-slate-800/80 px-4 py-1.5 text-[11px] font-mono flex items-center justify-between gap-4 overflow-x-auto whitespace-nowrap">
    <div class="flex items-center gap-5" id="tickerRibbon">
      <span class="flex items-center gap-1.5 text-emerald-400 font-semibold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        MARKET LIVE
      </span>
      <span>BTC/USDT <strong class="text-emerald-400" id="ribbon-BTC">$89,420.50 (+3.84%)</strong></span>
      <span>ETH/USDT <strong class="text-emerald-400" id="ribbon-ETH">$3,185.20 (+2.41%)</strong></span>
      <span>NIFTY 50 <strong class="text-emerald-400" id="ribbon-NIFTY">24,865.40 (+1.12%)</strong></span>
      <span>SOL/USDT <strong class="text-emerald-400" id="ribbon-SOL">$214.80 (+6.15%)</strong></span>
      <span>XAU/USD (GOLD) <strong class="text-amber-300" id="ribbon-GOLD">$2,748.90 (+0.95%)</strong></span>
    </div>
    <div class="text-slate-400 hidden md:block">24h Vol: <span class="text-cyan-300 font-semibold">$48.92B</span> · Latency: <span class="text-emerald-400">12ms</span></div>
  </div>

  <!-- Main Exchange Navbar -->
  <header class="sticky top-0 z-30 bg-[#0b101b]/95 backdrop-blur-xl border-b border-slate-800/90 px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
    <div class="flex items-center gap-6">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black font-display text-base shadow-lg shadow-emerald-500/20">
          TX
        </div>
        <div>
          <div class="font-display font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
            <span>TRADEX <span class="text-emerald-400">PRO</span></span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">TERMINAL v4.2</span>
          </div>
        </div>
      </div>

      <!-- Market Pair Selector Pills -->
      <div class="hidden md:flex items-center gap-1.5 bg-[#060911] p-1 rounded-xl border border-slate-800" id="pairButtons">
        <button onclick="selectMarket('BTC')" id="btn-BTC" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 transition">BTC/USDT</button>
        <button onclick="selectMarket('ETH')" id="btn-ETH" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition">ETH/USDT</button>
        <button onclick="selectMarket('NIFTY')" id="btn-NIFTY" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition">NIFTY 50</button>
        <button onclick="selectMarket('SOL')" id="btn-SOL" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition">SOL/USDT</button>
        <button onclick="selectMarket('GOLD')" id="btn-GOLD" class="px-3 py-1 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition">GOLD/USD</button>
      </div>
    </div>

    <!-- Demo Account Balance & Reset -->
    <div class="flex items-center gap-3">
      <div class="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
        <div>
          <div class="text-[10px] text-slate-400 uppercase tracking-wider">Available Margin</div>
          <div class="text-xs sm:text-sm font-mono font-bold text-emerald-400" id="walletBalance">$25,000.00</div>
        </div>
        <div class="h-6 w-px bg-slate-800"></div>
        <div>
          <div class="text-[10px] text-slate-400 uppercase tracking-wider">Unrealized PnL</div>
          <div class="text-xs sm:text-sm font-mono font-bold text-emerald-400" id="totalPnl">+$0.00</div>
        </div>
      </div>
      <button onclick="addDemoFunds()" class="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition">
        + Deposit $10k
      </button>
    </div>
  </header>

  <!-- Main Trading Terminal Grid -->
  <main class="flex-1 max-w-[1600px] w-full mx-auto p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5">

    <!-- Left + Center: Chart & Active Positions (8 Cols) -->
    <div class="lg:col-span-8 flex flex-col gap-3.5">

      <!-- Active Instrument Header Bar -->
      <div class="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="font-display font-bold text-lg sm:text-xl text-white" id="activeSymbolTitle">BTC/USDT Perpetual</h1>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" id="activeChangeBadge">+3.84%</span>
            </div>
            <p class="text-xs text-slate-400" id="activeAssetSub">Bitcoin vs Tether US · Real-Time Institutional Feed</p>
          </div>
          <div class="pl-4 border-l border-slate-800">
            <div class="text-xl sm:text-2xl font-mono font-bold text-emerald-400" id="activePriceDisplay">$89,420.50</div>
            <div class="text-[11px] font-mono text-slate-400">Mark Price: <span id="markPriceDisplay">$89,418.10</span></div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <div class="text-slate-500 text-[10px]">24h High</div>
            <div class="text-slate-200 font-semibold" id="statHigh">$90,120.00</div>
          </div>
          <div>
            <div class="text-slate-500 text-[10px]">24h Low</div>
            <div class="text-slate-200 font-semibold" id="statLow">$86,410.00</div>
          </div>
          <div>
            <div class="text-slate-500 text-[10px]">AI Signal</div>
            <div class="text-emerald-400 font-bold" id="aiSignalBadge">STRONG BUY</div>
          </div>
        </div>
      </div>

      <!-- Interactive Candlestick Chart Box -->
      <div class="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-800/80">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] text-slate-400 font-mono mr-1">Timeframe:</span>
            <button onclick="setTimeframe('1m')" id="tf-1m" class="px-2.5 py-1 rounded-lg text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">1m</button>
            <button onclick="setTimeframe('5m')" id="tf-5m" class="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white">5m</button>
            <button onclick="setTimeframe('15m')" id="tf-15m" class="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white">15m</button>
            <button onclick="setTimeframe('1H')" id="tf-1H" class="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white">1H</button>
            <button onclick="setTimeframe('1D')" id="tf-1D" class="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white">1D</button>
          </div>
          <div class="flex items-center gap-3 text-[11px] font-mono">
            <span class="flex items-center gap-1 text-cyan-400"><span class="w-2 h-0.5 bg-cyan-400 inline-block"></span> EMA 20</span>
            <span class="flex items-center gap-1 text-amber-400"><span class="w-2 h-0.5 bg-amber-400 inline-block"></span> VWAP</span>
            <span class="text-slate-400" id="candleStatus">Live Tick Active</span>
          </div>
        </div>

        <div class="relative w-full h-[320px] sm:h-[360px] bg-[#070b12] rounded-xl overflow-hidden border border-slate-800/60">
          <canvas id="tradingCanvas" class="w-full h-full block"></canvas>
        </div>
      </div>

      <!-- Open Positions & Order History Table -->
      <div class="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h2 class="font-display font-bold text-sm text-white">Open Positions &amp; Live PnL</h2>
            <span id="positionsCount" class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/20 text-cyan-300">1</span>
          </div>
          <button onclick="closeAllPositions()" class="text-xs font-mono text-rose-400 hover:text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg bg-rose-500/10 transition">
            Close All Positions
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 text-[11px]">
                <th class="py-2 px-2">Market</th>
                <th class="py-2 px-2">Side</th>
                <th class="py-2 px-2">Size (USD)</th>
                <th class="py-2 px-2">Entry Price</th>
                <th class="py-2 px-2">Mark Price</th>
                <th class="py-2 px-2">Unrealized PnL (ROE%)</th>
                <th class="py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody id="positionsTableBody" class="divide-y divide-slate-800/60">
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right Column: Order Execution Panel + Live Orderbook (4 Cols) -->
    <div class="lg:col-span-4 flex flex-col gap-3.5">

      <!-- Buy / Long & Sell / Short Execution Card -->
      <div class="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="font-display font-bold text-sm text-white">Execute Trade Order</span>
          <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">Cross Margin</span>
        </div>

        <!-- Long / Short Tabs -->
        <div class="grid grid-cols-2 gap-2 p-1 bg-[#060911] rounded-xl border border-slate-800 mb-4">
          <button id="sideBuyBtn" onclick="setOrderSide('LONG')" class="py-2 rounded-lg font-display font-bold text-xs bg-emerald-500 text-slate-950 shadow-md transition">
            BUY / LONG ↗
          </button>
          <button id="sideSellBtn" onclick="setOrderSide('SHORT')" class="py-2 rounded-lg font-display font-bold text-xs text-slate-400 hover:text-white transition">
            SELL / SHORT ↘
          </button>
        </div>

        <!-- Order Amount & Leverage -->
        <div class="space-y-3.5 text-xs">
          <div>
            <div class="flex justify-between text-slate-400 mb-1">
              <span>Margin Amount (USDT)</span>
              <span class="font-mono text-slate-300">Avail: <strong id="availLabel">$25,000</strong></span>
            </div>
            <div class="flex items-center bg-[#060911] border border-slate-800 rounded-xl px-3 py-2">
              <input id="orderAmountInput" type="number" value="1000" min="10" step="100" class="bg-transparent font-mono text-sm text-white focus:outline-none w-full" />
              <span class="text-slate-400 font-mono text-xs ml-2">USDT</span>
            </div>
            <div class="grid grid-cols-4 gap-1.5 mt-2 font-mono text-[11px]">
              <button onclick="setQuickAmount(250)" class="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">$250</button>
              <button onclick="setQuickAmount(1000)" class="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">$1,000</button>
              <button onclick="setQuickAmount(2500)" class="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">$2,500</button>
              <button onclick="setQuickAmount(5000)" class="py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">$5,000</button>
            </div>
          </div>

          <div>
            <div class="flex justify-between text-slate-400 mb-1">
              <span>Leverage Multiplier</span>
              <span class="font-mono font-bold text-cyan-300" id="leverageLabel">10x</span>
            </div>
            <input id="leverageSlider" type="range" min="1" max="50" value="10" oninput="updateLeverage(this.value)" class="w-full accent-emerald-400 cursor-pointer" />
            <div class="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1x</span><span>10x</span><span>25x</span><span>50x</span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-[#060911] border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
            <div class="flex justify-between">
              <span class="text-slate-400">Position Buying Power:</span>
              <span class="text-white font-semibold" id="buyingPowerPreview">$10,000.00</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Execution Price:</span>
              <span class="text-emerald-400" id="execPricePreview">Market ($89,420.50)</span>
            </div>
          </div>

          <button id="submitOrderBtn" onclick="executeMarketOrder()" class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-display font-bold text-sm shadow-lg shadow-emerald-500/20 transition">
            PLACE LONG ORDER (BTC/USDT)
          </button>

          <div id="orderToast" class="hidden text-center py-2 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-xs"></div>
        </div>
      </div>

      <!-- Live Orderbook -->
      <div class="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 flex-1 flex flex-col">
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="font-display font-bold text-xs uppercase tracking-wider text-slate-300">Live Order Book</h3>
          <span class="text-[10px] font-mono text-emerald-400">0.01 Spread</span>
        </div>
        <div class="grid grid-cols-3 text-[10px] font-mono text-slate-500 pb-1.5 border-b border-slate-800">
          <span>Price (USDT)</span>
          <span class="text-right">Size</span>
          <span class="text-right">Total (USD)</span>
        </div>
        <!-- Asks (Red) -->
        <div id="orderbookAsks" class="divide-y divide-slate-900/40 font-mono text-[11px] py-1.5 space-y-1"></div>
        <!-- Mid Price -->
        <div class="py-2 my-1 border-y border-slate-800 flex items-center justify-between font-mono">
          <span class="text-sm font-bold text-emerald-400" id="obMidPrice">$89,420.50</span>
          <span class="text-[10px] text-slate-400">Spread: 0.02%</span>
        </div>
        <!-- Bids (Green) -->
        <div id="orderbookBids" class="divide-y divide-slate-900/40 font-mono text-[11px] py-1.5 space-y-1"></div>
      </div>
    </div>
  </main>

  <script>
    const MARKETS = {
      BTC: { name: "BTC/USDT Perpetual", sub: "Bitcoin vs Tether US · Institutional Feed", price: 89420.50, change: 3.84, high: 90120, low: 86410, signal: "STRONG BUY", volatility: 45 },
      ETH: { name: "ETH/USDT Perpetual", sub: "Ethereum Smart Contract Network", price: 3185.20, change: 2.41, high: 3240, low: 3090, signal: "BUY", volatility: 4.5 },
      NIFTY: { name: "NIFTY 50 Index Futures", sub: "NSE India Benchmark Index", price: 24865.40, change: 1.12, high: 24950, low: 24680, signal: "BULLISH BREAKOUT", volatility: 14 },
      SOL: { name: "SOL/USDT Perpetual", sub: "Solana High-Speed L1 Ecosystem", price: 214.80, change: 6.15, high: 221, low: 198, signal: "STRONG BUY", volatility: 1.2 },
      GOLD: { name: "XAU/USD Spot Gold", sub: "Gold Bullion vs US Dollar", price: 2748.90, change: 0.95, high: 2762, low: 2731, signal: "ACCUMULATE", volatility: 2.2 }
    };

    let currentSym = "BTC";
    let currentSide = "LONG";
    let currentLeverage = 10;
    let walletBalance = 25000.00;
    let candles = [];
    let positions = [
      { id: 1, sym: "BTC", side: "LONG", margin: 1500, leverage: 10, entry: 88950.00 }
    ];

    function initCandles(basePrice, vol) {
      candles = [];
      let p = basePrice - vol * 8;
      for (let i = 0; i < 48; i++) {
        const open = p;
        const delta = (Math.random() - 0.46) * vol * 2.2;
        const close = +(open + delta).toFixed(2);
        const high = +(Math.max(open, close) + Math.random() * vol * 1.3).toFixed(2);
        const low = +(Math.min(open, close) - Math.random() * vol * 1.3).toFixed(2);
        candles.push({ open, high, low, close });
        p = close;
      }
      MARKETS[currentSym].price = p;
    }

    function formatUsd(val) {
      return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function selectMarket(sym) {
      currentSym = sym;
      Object.keys(MARKETS).forEach(k => {
        const btn = document.getElementById("btn-" + k);
        if (!btn) return;
        if (k === sym) {
          btn.className = "px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 transition";
        } else {
          btn.className = "px-3 py-1 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition";
        }
      });
      const m = MARKETS[sym];
      document.getElementById("activeSymbolTitle").textContent = m.name;
      document.getElementById("activeAssetSub").textContent = m.sub;
      document.getElementById("statHigh").textContent = formatUsd(m.high);
      document.getElementById("statLow").textContent = formatUsd(m.low);
      document.getElementById("aiSignalBadge").textContent = m.signal;
      initCandles(m.price, m.volatility);
      updateOrderButtonLabel();
      renderAll();
    }

    function setTimeframe(tf) {
      ["1m", "5m", "15m", "1H", "1D"].forEach(t => {
        const el = document.getElementById("tf-" + t);
        if (!el) return;
        el.className = t === tf
          ? "px-2.5 py-1 rounded-lg text-xs font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
          : "px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white";
      });
      initCandles(MARKETS[currentSym].price, MARKETS[currentSym].volatility);
      drawChart();
    }

    function setOrderSide(side) {
      currentSide = side;
      const buyBtn = document.getElementById("sideBuyBtn");
      const sellBtn = document.getElementById("sideSellBtn");
      if (side === "LONG") {
        buyBtn.className = "py-2 rounded-lg font-display font-bold text-xs bg-emerald-500 text-slate-950 shadow-md transition";
        sellBtn.className = "py-2 rounded-lg font-display font-bold text-xs text-slate-400 hover:text-white transition";
      } else {
        sellBtn.className = "py-2 rounded-lg font-display font-bold text-xs bg-rose-500 text-white shadow-md transition";
        buyBtn.className = "py-2 rounded-lg font-display font-bold text-xs text-slate-400 hover:text-white transition";
      }
      updateOrderButtonLabel();
    }

    function updateOrderButtonLabel() {
      const btn = document.getElementById("submitOrderBtn");
      if (currentSide === "LONG") {
        btn.className = "w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-display font-bold text-sm shadow-lg shadow-emerald-500/20 transition";
        btn.textContent = "PLACE LONG ORDER (" + currentSym + "/USDT)";
      } else {
        btn.className = "w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-display font-bold text-sm shadow-lg shadow-rose-500/20 transition";
        btn.textContent = "PLACE SHORT ORDER (" + currentSym + "/USDT)";
      }
      updateBuyingPowerPreview();
    }

    function setQuickAmount(val) {
      document.getElementById("orderAmountInput").value = val;
      updateBuyingPowerPreview();
    }

    function updateLeverage(val) {
      currentLeverage = Number(val);
      document.getElementById("leverageLabel").textContent = currentLeverage + "x";
      updateBuyingPowerPreview();
    }

    function updateBuyingPowerPreview() {
      const margin = Number(document.getElementById("orderAmountInput").value || 0);
      document.getElementById("buyingPowerPreview").textContent = formatUsd(margin * currentLeverage);
      document.getElementById("execPricePreview").textContent = "Market (" + formatUsd(MARKETS[currentSym].price) + ")";
    }

    document.getElementById("orderAmountInput").addEventListener("input", updateBuyingPowerPreview);

    function executeMarketOrder() {
      const margin = Number(document.getElementById("orderAmountInput").value || 0);
      if (margin <= 0 || margin > walletBalance) {
        alert("Insufficient margin balance! Click '+ Deposit $10k' to add demo funds.");
        return;
      }
      walletBalance -= margin;
      const entry = MARKETS[currentSym].price;
      positions.unshift({
        id: Date.now(),
        sym: currentSym,
        side: currentSide,
        margin,
        leverage: currentLeverage,
        entry
      });
      const toast = document.getElementById("orderToast");
      toast.textContent = "✓ Executed " + currentSide + " " + currentSym + " (" + currentLeverage + "x) @ " + formatUsd(entry);
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3000);
      renderAll();
    }

    function closePosition(id) {
      const idx = positions.findIndex(p => p.id === id);
      if (idx === -1) return;
      const pos = positions[idx];
      const mark = MARKETS[pos.sym].price;
      const priceDiffRatio = (mark - pos.entry) / pos.entry;
      const pnl = pos.margin * pos.leverage * (pos.side === "LONG" ? priceDiffRatio : -priceDiffRatio);
      walletBalance += pos.margin + pnl;
      positions.splice(idx, 1);
      renderAll();
    }

    function closeAllPositions() {
      while (positions.length > 0) {
        closePosition(positions[0].id);
      }
    }

    function addDemoFunds() {
      walletBalance += 10000;
      renderAll();
    }

    function drawChart() {
      const canvas = document.getElementById("tradingCanvas");
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (candles.length === 0) return;
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      const maxP = Math.max(...highs);
      const minP = Math.min(...lows);
      const range = Math.max(maxP - minP, 0.01);

      // Grid lines
      ctx.strokeStyle = "rgba(30, 41, 59, 0.55)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const y = (h / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();

        const priceLabel = (maxP - ((i / 5) * range)).toFixed(2);
        ctx.fillStyle = "#64748b";
        ctx.font = "10px JetBrains Mono";
        ctx.fillText("$" + priceLabel, w - 72, y - 4);
      }

      const padLeft = 14;
      const padRight = 80;
      const usableW = w - padLeft - padRight;
      const step = usableW / candles.length;
      const candleW = Math.max(step * 0.62, 3);

      // EMA 20 Line
      ctx.beginPath();
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 1.6;
      candles.forEach((c, idx) => {
        const x = padLeft + idx * step + step / 2;
        const avg = (c.open + c.close) / 2;
        const y = 16 + ((maxP - avg) / range) * (h - 32);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Candlesticks
      candles.forEach((c, idx) => {
        const x = padLeft + idx * step + step / 2;
        const isBull = c.close >= c.open;
        const color = isBull ? "#10b981" : "#f43f5e";

        const highY = 16 + ((maxP - c.high) / range) * (h - 32);
        const lowY = 16 + ((maxP - c.low) / range) * (h - 32);
        const openY = 16 + ((maxP - c.open) / range) * (h - 32);
        const closeY = 16 + ((maxP - c.close) / range) * (h - 32);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        const topY = Math.min(openY, closeY);
        const bodyH = Math.max(Math.abs(closeY - openY), 2);
        ctx.fillStyle = color;
        ctx.fillRect(x - candleW / 2, topY, candleW, bodyH);
      });
    }

    function renderOrderBook() {
      const p = MARKETS[currentSym].price;
      const step = MARKETS[currentSym].volatility * 0.12;
      const asksEl = document.getElementById("orderbookAsks");
      const bidsEl = document.getElementById("orderbookBids");
      let asksHtml = "";
      let bidsHtml = "";
      for (let i = 5; i >= 1; i--) {
        const askP = (p + i * step).toFixed(2);
        const sz = (Math.random() * 2.4 + 0.2).toFixed(3);
        const tot = (Number(askP) * Number(sz)).toLocaleString("en-US", { maximumFractionDigits: 0 });
        asksHtml += \`<div class="grid grid-cols-3 py-0.5"><span class="text-rose-400">\${askP}</span><span class="text-right text-slate-300">\${sz}</span><span class="text-right text-slate-500">$\${tot}</span></div>\`;
      }
      for (let i = 1; i <= 5; i++) {
        const bidP = (p - i * step).toFixed(2);
        const sz = (Math.random() * 2.8 + 0.3).toFixed(3);
        const tot = (Number(bidP) * Number(sz)).toLocaleString("en-US", { maximumFractionDigits: 0 });
        bidsHtml += \`<div class="grid grid-cols-3 py-0.5"><span class="text-emerald-400">\${bidP}</span><span class="text-right text-slate-300">\${sz}</span><span class="text-right text-slate-500">$\${tot}</span></div>\`;
      }
      asksEl.innerHTML = asksHtml;
      bidsEl.innerHTML = bidsHtml;
      document.getElementById("obMidPrice").textContent = formatUsd(p);
    }

    function renderPositions() {
      const tbody = document.getElementById("positionsTableBody");
      document.getElementById("positionsCount").textContent = String(positions.length);
      let totalUnrealized = 0;

      if (positions.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="7" class="py-6 text-center text-slate-500">No open positions. Place a BUY/LONG or SELL/SHORT trade on the right!</td></tr>\`;
      } else {
        tbody.innerHTML = positions.map(pos => {
          const mark = MARKETS[pos.sym].price;
          const diffRatio = (mark - pos.entry) / pos.entry;
          const pnl = pos.margin * pos.leverage * (pos.side === "LONG" ? diffRatio : -diffRatio);
          const roe = (pnl / pos.margin) * 100;
          totalUnrealized += pnl;
          const pnlColor = pnl >= 0 ? "text-emerald-400" : "text-rose-400";
          const sign = pnl >= 0 ? "+" : "";
          return \`
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-2.5 px-2 font-bold text-white">\${pos.sym}/USDT <span class="text-[10px] text-cyan-400">\${pos.leverage}x</span></td>
              <td class="py-2.5 px-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold \${pos.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">\${pos.side}</span></td>
              <td class="py-2.5 px-2 text-slate-200">\${formatUsd(pos.margin * pos.leverage)}</td>
              <td class="py-2.5 px-2 text-slate-300">\${formatUsd(pos.entry)}</td>
              <td class="py-2.5 px-2 text-slate-200">\${formatUsd(mark)}</td>
              <td class="py-2.5 px-2 font-bold \${pnlColor}">\${sign}\${formatUsd(pnl)} (\${sign}\${roe.toFixed(2)}%)</td>
              <td class="py-2.5 px-2 text-right">
                <button onclick="closePosition(\${pos.id})" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-slate-700 transition">Market Close</button>
              </td>
            </tr>
          \`;
        }).join("");
      }

      document.getElementById("walletBalance").textContent = formatUsd(walletBalance);
      document.getElementById("availLabel").textContent = formatUsd(walletBalance);
      const pnlEl = document.getElementById("totalPnl");
      const sign = totalUnrealized >= 0 ? "+" : "";
      pnlEl.textContent = sign + formatUsd(totalUnrealized);
      pnlEl.className = "text-xs sm:text-sm font-mono font-bold " + (totalUnrealized >= 0 ? "text-emerald-400" : "text-rose-400");
    }

    function renderAll() {
      const m = MARKETS[currentSym];
      document.getElementById("activePriceDisplay").textContent = formatUsd(m.price);
      document.getElementById("markPriceDisplay").textContent = formatUsd(m.price - 1.4);
      updateBuyingPowerPreview();
      drawChart();
      renderOrderBook();
      renderPositions();
    }

    // Live Real-Time Price Tick Loop
    setInterval(() => {
      Object.keys(MARKETS).forEach(k => {
        const m = MARKETS[k];
        const delta = (Math.random() - 0.485) * m.volatility * 0.45;
        m.price = +(m.price + delta).toFixed(2);
        const rib = document.getElementById("ribbon-" + k);
        if (rib) {
          rib.textContent = formatUsd(m.price) + " (+" + m.change.toFixed(2) + "%)";
        }
      });
      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        last.close = MARKETS[currentSym].price;
        if (last.close > last.high) last.high = last.close;
        if (last.close < last.low) last.low = last.close;
        if (Math.random() < 0.28) {
          candles.push({
            open: last.close,
            high: last.close,
            low: last.close,
            close: last.close
          });
          if (candles.length > 48) candles.shift();
        }
      }
      renderAll();
    }, 1100);

    window.addEventListener("resize", drawChart);
    initCandles(MARKETS.BTC.price, MARKETS.BTC.volatility);
    renderAll();
  </script>
</body>
</html>`;

/**
 * Detects whether a prompt/title is asking for a Trading / Crypto / Stock / Forex / Market website.
 */
export function isTradingWebsiteRequest(text: string): boolean {
  const lower = (text || "").toLowerCase();
  return (
    lower.includes("trad") ||
    lower.includes("crypto") ||
    lower.includes("bitcoin") ||
    lower.includes("btc") ||
    lower.includes("stock") ||
    lower.includes("share market") ||
    lower.includes("nifty") ||
    lower.includes("sensex") ||
    lower.includes("forex") ||
    lower.includes("chart") ||
    lower.includes("exchange") ||
    lower.includes("binance") ||
    lower.includes("broker")
  );
}

/**
 * Generates a topic-specific, production-grade interactive website immediately
 * so the user NEVER gets an unrelated photo/portfolio template when building or publishing.
 */
export function synthesizeSmartWebsiteByTopic(
  prompt: string,
  suggestedTitle?: string,
  userName: string = "Devid"
): { title: string; htmlCode: string } {
  const combined = `${suggestedTitle || ""} ${prompt || ""}`.trim();

  if (isTradingWebsiteRequest(combined)) {
    const customTitle =
      suggestedTitle && !suggestedTitle.toLowerCase().includes("devid (@devid")
        ? suggestedTitle
        : `${userName} TradeX Pro — Live Crypto & Nifty Trading Terminal`;
    const customizedHtml = PRO_TRADING_WEBSITE_HTML.replace(
      /TRADEX <span class="text-emerald-400">PRO<\/span>/g,
      `${userName.toUpperCase()} <span class="text-emerald-400">TRADEX PRO</span>`
    ).replace(
      /<title>.*?<\/title>/,
      `<title>${customTitle}</title>`
    );
    return {
      title: customTitle,
      htmlCode: customizedHtml,
    };
  }

  // Dynamic Topic-Accurate Interactive Website Generator for any other custom topic
  const cleanTitle =
    suggestedTitle ||
    prompt
      .replace(/^(build|create|make|design|publish|ek|mera|meri)\s+/i, "")
      .replace(/\s+(website|site|web page|app|banao|bana do|publish karo).*$/i, "")
      .trim()
      .slice(0, 42) ||
    `${userName} Digital Studio`;

  const displayTitle =
    cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  const htmlCode = `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${displayTitle} — Official Interactive Web Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #070b14; color: #f8fafc; }
    h1, h2, h3, .font-display { font-family: 'Space Grotesk', sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-[#070b14] text-slate-100">
  <header class="sticky top-0 z-30 backdrop-blur-xl bg-[#070b14]/85 border-b border-white/10">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="font-display font-bold text-lg flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
        <span>${displayTitle}</span>
      </div>
      <nav class="hidden md:flex items-center gap-6 text-sm text-slate-300">
        <a href="#features" class="hover:text-white transition">Features</a>
        <a href="#dashboard" class="hover:text-white transition">Live Workspace</a>
        <a href="#contact" class="hover:text-white transition">Contact</a>
      </nav>
      <a href="#dashboard" class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs shadow-lg">
        Launch App
      </a>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-14 space-y-16">
    <section class="max-w-3xl space-y-6">
      <span class="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
        LIVE HOSTED WEB APPLICATION
      </span>
      <h1 class="font-display text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
        ${displayTitle}
      </h1>
      <p class="text-slate-400 text-base sm:text-lg leading-relaxed">
        Custom interactive platform crafted for <strong class="text-white">${userName}</strong>: ${prompt}
      </p>
      <div class="flex flex-wrap gap-3">
        <a href="#dashboard" class="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm transition">
          Open Interactive Dashboard
        </a>
        <a href="#contact" class="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-sm transition">
          Quick Inquiry
        </a>
      </div>
    </section>

    <section id="dashboard" class="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="font-display text-2xl font-bold">Interactive Control Center</h2>
          <p class="text-xs text-slate-400">Real-time calculator, booking &amp; analytics module for ${displayTitle}</p>
        </div>
        <span class="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono">STATUS: ONLINE</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-black/40 border border-white/10">
          <div class="text-xs text-slate-400">Active Sessions</div>
          <div class="font-display text-3xl font-bold text-cyan-400 mt-1" id="metric1">1,428</div>
        </div>
        <div class="p-5 rounded-2xl bg-black/40 border border-white/10">
          <div class="text-xs text-slate-400">Performance Score</div>
          <div class="font-display text-3xl font-bold text-emerald-400 mt-1">99.4%</div>
        </div>
        <div class="p-5 rounded-2xl bg-black/40 border border-white/10">
          <div class="text-xs text-slate-400">Instant Actions</div>
          <button onclick="document.getElementById('metric1').textContent = (Math.floor(Math.random()*900)+1500).toLocaleString()" class="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition">
            Refresh Live Metrics ↻
          </button>
        </div>
      </div>
    </section>

    <section id="contact" class="p-8 rounded-3xl bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
      <div>
        <h2 class="font-display text-2xl font-bold">Ready to collaborate with ${displayTitle}?</h2>
        <p class="text-sm text-slate-300 mt-1">Send an instant message or inquiry.</p>
      </div>
      <button onclick="alert('Thank you! Your request has been registered on ${displayTitle}.')" class="px-6 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm shrink-0 transition">
        Get Started Now →
      </button>
    </section>
  </main>
</body>
</html>`;

  return { title: displayTitle, htmlCode };
}
