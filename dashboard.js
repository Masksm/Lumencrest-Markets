(() => {
 const $ = s => document.querySelector(s);
 const client = window.supabase?.createClient && window.LUMENCREST_SUPABASE ? window.supabase.createClient(window.LUMENCREST_SUPABASE.url, window.LUMENCREST_SUPABASE.key) : null;
 const login = () => window.location.replace("auth.html");
 $("#year").textContent = String(new Date().getFullYear());
 $("#today-date").textContent = new Intl.DateTimeFormat(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"}).format(new Date());
 let symbols = [];
 try { const saved = JSON.parse(localStorage.getItem("lumencrest-watchlist") || "[]"); symbols = Array.isArray(saved) ? saved.filter(v => typeof v === "string") : []; } catch {}
 const marketPrices = new Map();
 const money = value => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:value >= 100 ? 2 : value >= 1 ? 3 : 5}).format(value);
 const pct = value => (Number(value) > 0 ? "+" : "") + Number(value).toFixed(2) + "%";
 const renderCrypto = data => {
   const list = $("#crypto-price-list"), status = $("#crypto-status"), updated = $("#crypto-updated");
   if (!list || !status || !updated) return;
   const names = {BTCUSDT:["Bitcoin","BTC"],ETHUSDT:["Ethereum","ETH"],SOLUSDT:["Solana","SOL"]};
   list.replaceChildren();
   data.forEach(item => {
     const meta = names[item.symbol]; if (!meta) return;
     const row = document.createElement("div"); row.className = "crypto-price-row";
     const label = document.createElement("span"); label.append(document.createTextNode(meta[0] + " "));
     const ticker = document.createElement("small"); ticker.textContent = meta[1]; label.append(ticker);
     const values = document.createElement("div"); values.className = "crypto-price-values";
     const price = document.createElement("strong"); price.textContent = money(Number(item.lastPrice));
     const change = document.createElement("small"); change.className = "crypto-change " + (Number(item.priceChangePercent) < 0 ? "negative" : "positive"); change.textContent = pct(item.priceChangePercent);
     values.append(price,change); row.append(label,values); list.append(row);
     marketPrices.set(meta[1], {price:Number(item.lastPrice), change:Number(item.priceChangePercent)});
   });
   status.textContent = "Live · Binance";
   updated.textContent = "Last checked " + new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit",second:"2-digit"}).format(new Date()) + " · 24h change";
   render();
 };
 const loadCryptoPrices = async () => {
   const status = $("#crypto-status"), updated = $("#crypto-updated");
   try {
     const response = await fetch("https://data-api.binance.vision/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%5D",{cache:"no-store"});
     if (!response.ok) throw new Error("Market provider returned HTTP " + response.status);
     const data = await response.json();
     if (!Array.isArray(data) || !data.some(item => item.symbol === "BTCUSDT" && Number.isFinite(Number(item.lastPrice)))) throw new Error("Market data response was not valid");
     renderCrypto(data);
   } catch (error) {
     if (status) status.textContent = marketPrices.size ? "Showing last available data" : "Temporarily unavailable";
     if (updated) updated.textContent = marketPrices.size ? "Refresh failed. Values may be stale; retrying shortly." : "Could not load prices. Check connection and refresh the page.";
   }
 };
 const render = () => {
   const list = $("#watchlist-items"); list.replaceChildren(); $("#watchlist-empty").hidden = symbols.length > 0;
   symbols.forEach(symbol => {
     const item = document.createElement("div"); item.className = "watchlist-item";
     const details = document.createElement("div"), name = document.createElement("strong"), note = document.createElement("small");
     name.className = "watchlist-symbol"; name.textContent = symbol; note.className = "watchlist-item-note"; const quote = marketPrices.get(symbol.replace(/[^A-Z0-9]/g,"")); note.textContent = quote ? money(quote.price) + " · 24h " + pct(quote.change) : "No matching live quote"; details.append(name,note);
     const remove = document.createElement("button"); remove.className = "remove-symbol"; remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label","Remove " + symbol + " from watchlist");
     remove.addEventListener("click",() => { symbols = symbols.filter(v => v !== symbol); save(); }); item.append(details,remove); list.append(item);
   });
 };
 const save = () => { try { localStorage.setItem("lumencrest-watchlist",JSON.stringify(symbols)); $("#watchlist-error").textContent = ""; render(); } catch { $("#watchlist-error").textContent = "This browser could not save your list."; } };
 $("#add-watchlist-button").addEventListener("click",() => { const form = $("#watchlist-form"); form.hidden = !form.hidden; if (!form.hidden) $("#watchlist-symbol").focus(); });
 $("#watchlist-form").addEventListener("submit",event => {
   event.preventDefault(); const input = $("#watchlist-symbol"), symbol = input.value.trim().replace(/\s+/g," ").toUpperCase(); $("#watchlist-error").textContent = "";
   if (!symbol) return;
   if (symbols.includes(symbol)) { $("#watchlist-error").textContent = "That symbol is already on your list."; return; }
   if (symbols.length >= 30) { $("#watchlist-error").textContent = "Your browser watchlist is limited to 30 items for now."; return; }
   symbols.push(symbol); input.value = ""; save();
 });
 render();
 loadCryptoPrices();
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