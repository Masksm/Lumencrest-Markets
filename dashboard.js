(() => {
 const $ = s => document.querySelector(s);
 const client = window.supabase?.createClient && window.LUMENCREST_SUPABASE ? window.supabase.createClient(window.LUMENCREST_SUPABASE.url, window.LUMENCREST_SUPABASE.key) : null;
 const login = () => window.location.replace("auth.html");
 $("#year").textContent = String(new Date().getFullYear());
 $("#today-date").textContent = new Intl.DateTimeFormat(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"}).format(new Date());
 let symbols = [];
 let cloudUserId = null;
 let cloudWatchlistReady = false;
 try { const saved = JSON.parse(localStorage.getItem("lumencrest-watchlist") || "[]"); symbols = Array.isArray(saved) ? saved.filter(v => typeof v === "string") : []; } catch {}
 const marketPrices = new Map();
 const assets = [
   {symbol:"BTC",pair:"BTCUSDT",name:"Bitcoin"}, {symbol:"ETH",pair:"ETHUSDT",name:"Ethereum"},
   {symbol:"SOL",pair:"SOLUSDT",name:"Solana"}, {symbol:"BNB",pair:"BNBUSDT",name:"BNB"},
   {symbol:"XRP",pair:"XRPUSDT",name:"XRP"}, {symbol:"ADA",pair:"ADAUSDT",name:"Cardano"},
   {symbol:"DOGE",pair:"DOGEUSDT",name:"Dogecoin"}, {symbol:"TRX",pair:"TRXUSDT",name:"TRON"},
   {symbol:"LINK",pair:"LINKUSDT",name:"Chainlink"}, {symbol:"AVAX",pair:"AVAXUSDT",name:"Avalanche"}
 ];
 let selectedAsset = "BTC";
 const money = value => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:value >= 100 ? 2 : value >= 1 ? 3 : 5}).format(value);
 const pct = value => (Number(value) > 0 ? "+" : "") + Number(value).toFixed(2) + "%";
 const renderCrypto = data => {
   const list = $("#crypto-price-list"), status = $("#crypto-status"), updated = $("#crypto-updated");
   const names = {BTCUSDT:["Bitcoin","BTC"],ETHUSDT:["Ethereum","ETH"],SOLUSDT:["Solana","SOL"]};
   if (list) {
     list.replaceChildren();
     data.filter(item => names[item.symbol]).forEach(item => {
       const meta = names[item.symbol], row = document.createElement("div"); row.className = "crypto-price-row";
       const label = document.createElement("span"); label.append(document.createTextNode(meta[0] + " "));
       const ticker = document.createElement("small"); ticker.textContent = meta[1]; label.append(ticker);
       const values = document.createElement("div"); values.className = "crypto-price-values";
       const price = document.createElement("strong"); price.textContent = money(Number(item.lastPrice));
       const change = document.createElement("small"); change.className = "crypto-change " + (Number(item.priceChangePercent) < 0 ? "negative" : "positive"); change.textContent = pct(item.priceChangePercent);
       values.append(price,change); row.append(label,values); list.append(row);
     });
   }
   data.forEach(item => {
     const asset = assets.find(candidate => candidate.pair === item.symbol);
     if (asset && Number.isFinite(Number(item.lastPrice))) marketPrices.set(asset.symbol,{price:Number(item.lastPrice),change:Number(item.priceChangePercent)});
   });
   if (status) status.textContent = "Live · Binance";
   if (updated) updated.textContent = "Last checked " + new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit",second:"2-digit"}).format(new Date()) + " · 24h change";
   renderExplorer();
   render();
   updateSelectedQuote();
 };
 const renderExplorer = () => {
   const container = $("#explorer-assets"); if (!container) return;
   const query = ($("#asset-search")?.value || "").trim().toLowerCase();
   const filtered = assets.filter(asset => (asset.name + " " + asset.symbol).toLowerCase().includes(query));
   container.replaceChildren();
   if (!filtered.length) { const empty = document.createElement("p"); empty.className = "explorer-message"; empty.textContent = "No matching asset in this starter list."; container.append(empty); return; }
   filtered.forEach(asset => {
     const quote = marketPrices.get(asset.symbol), button = document.createElement("button");
     button.type = "button"; button.className = "explorer-asset" + (selectedAsset === asset.symbol ? " selected" : "");
     button.setAttribute("aria-pressed",selectedAsset === asset.symbol ? "true" : "false");
     const identity = document.createElement("span"); identity.className = "explorer-asset-identity";
     const symbol = document.createElement("strong"); symbol.textContent = asset.symbol;
     const name = document.createElement("small"); name.textContent = asset.name; identity.append(symbol,name);
     const priceBox = document.createElement("span"); priceBox.className = "explorer-asset-quote";
     const price = document.createElement("strong"); price.textContent = quote ? money(quote.price) : "—";
     const change = document.createElement("small"); change.className = quote ? (quote.change < 0 ? "negative" : "positive") : ""; change.textContent = quote ? pct(quote.change) : "Quote unavailable";
     priceBox.append(price,change); button.append(identity,priceBox);
     button.addEventListener("click",() => { selectedAsset = asset.symbol; renderExplorer(); updateSelectedQuote(); loadAssetHistory(asset); });
     container.append(button);
   });
 };
 const updateSelectedQuote = () => {
   const asset = assets.find(item => item.symbol === selectedAsset); if (!asset) return;
   const quote = marketPrices.get(asset.symbol);
   const name = $("#selected-asset-name"), price = $("#selected-asset-price"), change = $("#selected-asset-change");
   if (name) { name.replaceChildren(document.createTextNode(asset.name + " ")); const ticker = document.createElement("span"); ticker.textContent = asset.symbol; name.append(ticker); }
   if (price) price.textContent = quote ? money(quote.price) : "Quote unavailable";
   if (change) { change.textContent = quote ? "24h " + pct(quote.change) : "Live quote not available"; change.className = "asset-current-change " + (quote ? (quote.change < 0 ? "negative" : "positive") : ""); }
 };
 const loadAssetHistory = async asset => {
   const status = $("#history-status"), chart = $("#asset-chart");
   if (!status || !chart) return;
   status.textContent = "Loading history…"; chart.replaceChildren();
   try {
     const response = await fetch("https://data-api.binance.vision/api/v3/klines?symbol=" + encodeURIComponent(asset.pair) + "&interval=4h&limit=42",{cache:"no-store"});
     if (!response.ok) throw new Error("Historical market data returned HTTP " + response.status);
     const candles = await response.json();
     const points = Array.isArray(candles) ? candles.map(c => ({time:Number(c[0]),price:Number(c[4])})).filter(p => Number.isFinite(p.time) && Number.isFinite(p.price)) : [];
     if (points.length < 2) throw new Error("Not enough historical data");
     const width = 640, height = 220, pad = 12, values = points.map(p => p.price);
     let min = Math.min(...values), max = Math.max(...values); if (min === max) { min *= .999; max *= 1.001; }
     const coords = points.map((p,i) => ({x:pad + i*(width-pad*2)/(points.length-1),y:pad+(max-p.price)*(height-pad*2)/(max-min)}));
     const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
     svg.setAttribute("viewBox","0 0 "+width+" "+height); svg.setAttribute("preserveAspectRatio","none"); svg.setAttribute("class","history-svg"); svg.setAttribute("aria-label",asset.name+" seven-day closing prices");
     [0.25,0.5,0.75].forEach(ratio => { const line = document.createElementNS(svg.namespaceURI,"line"); const y = pad+(height-pad*2)*ratio; line.setAttribute("x1",pad);line.setAttribute("x2",width-pad);line.setAttribute("y1",y);line.setAttribute("y2",y);line.setAttribute("class","chart-grid-line");svg.append(line); });
     const polyline = document.createElementNS(svg.namespaceURI,"polyline"); polyline.setAttribute("points",coords.map(p=>p.x.toFixed(2)+","+p.y.toFixed(2)).join(" ")); polyline.setAttribute("class","history-line"); svg.append(polyline);
     const dot = document.createElementNS(svg.namespaceURI,"circle"); const last = coords[coords.length-1]; dot.setAttribute("cx",last.x);dot.setAttribute("cy",last.y);dot.setAttribute("r","4");dot.setAttribute("class","history-dot");svg.append(dot);
     chart.append(svg);
     const range = document.createElement("small"); range.className = "chart-range-note"; range.textContent = "Range: " + money(min) + " to " + money(max) + " · " + points.length + " candles"; chart.append(range);
     status.textContent = "History loaded";
   } catch (error) {
     const message = document.createElement("p"); message.className = "explorer-message"; message.textContent = "Historical chart unavailable for this asset right now. Try again shortly."; chart.append(message); status.textContent = "Unavailable";
   }
 };
 const loadCryptoPrices = async () => {
   const status = $("#crypto-status"), updated = $("#crypto-updated");
   try {
     const pairs = assets.map(asset => asset.pair);
     const response = await fetch("https://data-api.binance.vision/api/v3/ticker/24hr?symbols=" + encodeURIComponent(JSON.stringify(pairs)),{cache:"no-store"});
     if (!response.ok) throw new Error("Market provider returned HTTP " + response.status);
     const data = await response.json();
     if (!Array.isArray(data) || !data.some(item => item.symbol === "BTCUSDT" && Number.isFinite(Number(item.lastPrice)))) throw new Error("Market data response was not valid");
     renderCrypto(data);
   } catch (error) {
     if (status) status.textContent = marketPrices.size ? "Showing last available data" : "Temporarily unavailable";
     if (updated) updated.textContent = marketPrices.size ? "Refresh failed. Values may be stale; retrying shortly." : "Could not load prices. Check connection and refresh the page.";
     renderExplorer();
     updateSelectedQuote();
   }
 };
 const render = () => {
   const list = $("#watchlist-items"); list.replaceChildren(); $("#watchlist-empty").hidden = symbols.length > 0;
   symbols.forEach(symbol => {
     const item = document.createElement("div"); item.className = "watchlist-item";
     const details = document.createElement("div"), name = document.createElement("strong"), note = document.createElement("small");
     name.className = "watchlist-symbol"; name.textContent = symbol; note.className = "watchlist-item-note"; const quote = marketPrices.get(symbol.replace(/[^A-Z0-9]/g,"")); note.textContent = quote ? money(quote.price) + " · 24h " + pct(quote.change) : "No matching live quote"; details.append(name,note);
     const remove = document.createElement("button"); remove.className = "remove-symbol"; remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label","Remove " + symbol + " from watchlist");
     remove.addEventListener("click",() => { remove.disabled = true; removeSymbol(symbol).finally(() => { remove.disabled = false; }); }); item.append(details,remove);
   });
 };
 const saveLocal = () => { try { localStorage.setItem("lumencrest-watchlist",JSON.stringify(symbols)); } catch {} };
 const loadCloudWatchlist = async userId => {
   const message = $("#watchlist-error");
   cloudUserId = userId;
   try {
     const {data,error} = await client.from("user_watchlists").select("symbol").eq("user_id",userId).order("created_at",{ascending:true});
     if (error) throw error;
     const remote = (data || []).map(row => row.symbol).filter(symbol => typeof symbol === "string");
     if (remote.length === 0 && symbols.length > 0) {
       const rows = [...new Set(symbols)].slice(0,30).map(symbol => ({user_id:userId,symbol}));
       const {error:insertError} = await client.from("user_watchlists").insert(rows);
       if (insertError) throw insertError;
       symbols = rows.map(row => row.symbol);
     } else {
       symbols = remote.slice(0,30);
     }
     cloudWatchlistReady = true;
     saveLocal();
     message.textContent = "Watchlist synced to your account.";
     render();
   } catch (error) {
     cloudWatchlistReady = false;
     message.textContent = "Cloud sync is temporarily unavailable. Your saved browser list is still here.";
     render();
   }
 };
 const addSymbol = async symbol => {
   const message = $("#watchlist-error");
   if (symbols.includes(symbol)) { message.textContent = "That symbol is already on your list."; return; }
   if (symbols.length >= 30) { message.textContent = "Your watchlist is limited to 30 items for now."; return; }
   if (!cloudWatchlistReady || !cloudUserId) { message.textContent = "Secure watchlist sync is still loading. Try again shortly."; return; }
   const {error} = await client.from("user_watchlists").insert({user_id:cloudUserId,symbol});
   if (error) { message.textContent = error.code === "23505" ? "That symbol is already on your list." : "Could not save this symbol. Try again."; return; }
   symbols.push(symbol); saveLocal(); message.textContent = "Saved to your account."; render();
 };
 const removeSymbol = async symbol => {
   const message = $("#watchlist-error");
   if (!cloudWatchlistReady || !cloudUserId) { message.textContent = "Secure watchlist sync is still loading. Try again shortly."; return; }
   const {error} = await client.from("user_watchlists").delete().eq("user_id",cloudUserId).eq("symbol",symbol);
   if (error) { message.textContent = "Could not remove this symbol. Try again."; return; }
   symbols = symbols.filter(value => value !== symbol); saveLocal(); message.textContent = "Removed from your account."; render();
 };
 $("#add-watchlist-button").addEventListener("click",() => { const form = $("#watchlist-form"); form.hidden = !form.hidden; if (!form.hidden) $("#watchlist-symbol").focus(); });
 $("#watchlist-form").addEventListener("submit",async event => {
   event.preventDefault(); const input = $("#watchlist-symbol"), symbol = input.value.trim().replace(/\s+/g," ").toUpperCase(); $("#watchlist-error").textContent = "";
   if (!symbol) return;
   await addSymbol(symbol);
   if (symbols.includes(symbol)) input.value = "";
 });
 render();
 $("#asset-search")?.addEventListener("input",renderExplorer);
 renderExplorer();
 updateSelectedQuote();
 loadCryptoPrices();
 loadAssetHistory(assets.find(asset => asset.symbol === selectedAsset));
 window.setInterval(loadCryptoPrices, 60000);
 $("#signout-button").addEventListener("click",async () => {
   const button = $("#signout-button"); button.disabled = true; button.textContent = "Signing out…";
   if (client) { const {error} = await client.auth.signOut(); if (error) { button.disabled = false; button.textContent = "Sign out"; window.alert("Could not sign out: " + error.message); return; } }
   login();
 });
 (async () => {
   if (!client) { $("#welcome-message").textContent = "Authentication configuration could not load. Refresh to try again."; return; }
   const {data,error} = await client.auth.getSession(); if (error || !data.session) return login();
   const user = data.session.user, full = user.user_metadata?.full_name || user.user_metadata?.name || "", display = full.trim() || (user.email ? user.email.split("@")[0] : "there");
   $("#welcome-message").textContent = "Welcome, " + display + ". Your research workspace is ready.";
   $("#account-email").textContent = user.email || "Signed-in account"; $("#account-email").title = user.email || ""; $("#account-avatar").textContent = (display[0] || "L").toUpperCase();
   await loadCloudWatchlist(user.id);
 })();
 // Keep navigation highlighting synchronized with the visible section.
 const workspaceLinks = Array.from(document.querySelectorAll(".dashboard-links a"));
 const workspaceSections = workspaceLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
 const markCurrentSection = id => {
   workspaceLinks.forEach(link => {
     const active = link.getAttribute("href") === "#" + id;
     link.classList.toggle("active", active);
     if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
   });
 };
 workspaceLinks.forEach(link => link.addEventListener("click", () => markCurrentSection(link.getAttribute("href").slice(1))));
 window.addEventListener("hashchange", () => {
   const id = window.location.hash.slice(1);
   if (workspaceLinks.some(link => link.getAttribute("href") === "#" + id)) markCurrentSection(id);
 });
 if ("IntersectionObserver" in window) {
   const sectionObserver = new IntersectionObserver(entries => {
     const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
     if (visible) markCurrentSection(visible.target.id);
   }, { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.1, 0.25] });
   workspaceSections.forEach(section => sectionObserver.observe(section));
 }
 const initialSection = window.location.hash.slice(1);
 markCurrentSection(workspaceLinks.some(link => link.getAttribute("href") === "#" + initialSection) ? initialSection : "overview");

})();