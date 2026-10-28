(() => {
  const $ = selector => document.querySelector(selector);
  const config = window.LUMENCREST_SUPABASE;
  const client = window.supabase?.createClient && config ? window.supabase.createClient(config.url, config.key) : null;
  const login = () => window.location.replace("auth.html");
  $("#year").textContent = String(new Date().getFullYear());
  $("#today-date").textContent = new Intl.DateTimeFormat(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"}).format(new Date());

  $("#signout-button").addEventListener("click", async () => {
    const button = $("#signout-button");
    button.disabled = true;
    button.textContent = "Signing out…";
    if (client) {
      const {error} = await client.auth.signOut();
      if (error) {
        button.disabled = false;
        button.textContent = "Sign out";
        window.alert("Could not sign out: " + error.message);
        return;
      }
    }
    login();
  });

  async function loadSnapshot() {
    const status = $("#overview-crypto-status");
    const list = $("#overview-crypto-prices");
    const updated = $("#overview-crypto-updated");
    try {
      const pairs = ["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","TRXUSDT","LINKUSDT","AVAXUSDT"];
      const response = await fetch("https://data-api.binance.vision/api/v3/ticker/24hr?symbols=" + encodeURIComponent(JSON.stringify(pairs)), {cache:"no-store"});
      if (!response.ok) throw new Error("Market data unavailable");
      const data = await response.json();
      const names = {BTCUSDT:["Bitcoin","BTC"],ETHUSDT:["Ethereum","ETH"],SOLUSDT:["Solana","SOL"],BNBUSDT:["BNB","BNB"],XRPUSDT:["XRP","XRP"],ADAUSDT:["Cardano","ADA"],DOGEUSDT:["Dogecoin","DOGE"],TRXUSDT:["TRON","TRX"],LINKUSDT:["Chainlink","LINK"],AVAXUSDT:["Avalanche","AVAX"]};
      list.replaceChildren();
      const validQuotes = data.filter(item => names[item.symbol] && Number.isFinite(Number(item.lastPrice)) && Number.isFinite(Number(item.priceChangePercent)));
      validQuotes.slice(0,3).forEach(item => {
        const row = document.createElement("div"); row.className = "crypto-price-row";
        const label = document.createElement("span"); label.append(document.createTextNode(names[item.symbol][0] + " "));
        const ticker = document.createElement("small"); ticker.textContent = names[item.symbol][1]; label.append(ticker);
        const values = document.createElement("div"); values.className = "crypto-price-values";
        const price = document.createElement("strong"); price.textContent = new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:Number(item.lastPrice)>=100?2:3}).format(Number(item.lastPrice));
        const change = document.createElement("small"); change.className = "crypto-change " + (Number(item.priceChangePercent)<0?"negative":"positive");
        change.textContent = (Number(item.priceChangePercent)>0?"+":"") + Number(item.priceChangePercent).toFixed(2) + "%";
        values.append(price,change); row.append(label,values); list.append(row);
      });
      if (!list.children.length) throw new Error("No quotes returned");
      status.textContent = "Quotes loaded";
      updated.textContent = "Binance spot data · Checked " + new Date().toLocaleTimeString() + " · 24h change";
      renderMovers(validQuotes, names);
      await loadWatchlist(validQuotes, names);
    } catch {
      status.textContent = "Temporarily unavailable";
      list.textContent = "Crypto quotes could not be loaded. Open Markets to retry.";
      updated.textContent = "Source: Binance public spot-market API.";
      $("#overview-movers-status").textContent = "Market activity is temporarily unavailable.";
      $("#overview-movers-list").textContent = "Try opening Markets to reload quotes.";
      await loadWatchlist([], {BTCUSDT:["Bitcoin","BTC"],ETHUSDT:["Ethereum","ETH"],SOLUSDT:["Solana","SOL"],BNBUSDT:["BNB","BNB"],XRPUSDT:["XRP","XRP"],ADAUSDT:["Cardano","ADA"],DOGEUSDT:["Dogecoin","DOGE"],TRXUSDT:["TRON","TRX"],LINKUSDT:["Chainlink","LINK"],AVAXUSDT:["Avalanche","AVAX"]});
    }
  }


  const cryptoSymbols = new Set(["BTC","ETH","SOL","BNB","XRP","ADA","DOGE","TRX","LINK","AVAX"]);
  const formatPrice = value => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:value>=100?2:value>=1?3:6}).format(value);
  function renderMovers(quotes, names) {
    const box=$("#overview-movers-list"), status=$("#overview-movers-status");
    const ranked=[...quotes].sort((a,b)=>Math.abs(Number(b.priceChangePercent))-Math.abs(Number(a.priceChangePercent))).slice(0,5);
    box.replaceChildren();
    if(!ranked.length){box.textContent="No market quotes are available.";status.textContent="Unavailable";return;}
    ranked.forEach(item=>{
      const symbol=item.symbol.replace("USDT",""), move=Number(item.priceChangePercent);
      const row=document.createElement("a");row.className="overview-mover-row";row.href="asset.html?symbol="+encodeURIComponent(symbol);
      const identity=document.createElement("span");identity.className="overview-mover-identity";
      const ticker=document.createElement("strong");ticker.textContent=symbol;
      const name=document.createElement("small");name.textContent=(names[item.symbol]||["",""])[0];identity.append(ticker,name);
      const values=document.createElement("span");values.className="overview-mover-values";
      const price=document.createElement("strong");price.textContent=formatPrice(Number(item.lastPrice));
      const change=document.createElement("small");change.className="crypto-change "+(move<0?"negative":"positive");change.textContent=(move>0?"+":"")+move.toFixed(2)+"%";
      values.append(price,change);row.append(identity,values);box.append(row);
    });
    status.textContent="Showing "+ranked.length+" largest absolute moves · updated "+new Date().toLocaleTimeString();
  }
  async function loadWatchlist(quotes, names) {
    const box=$("#overview-watchlist-list"), status=$("#overview-watchlist-status");
    box.replaceChildren();
    if(!client){box.textContent="Account service unavailable.";status.textContent="Unavailable";return;}
    try {
      const {data:sessionData,error:sessionError}=await client.auth.getSession();
      if(sessionError||!sessionData.session){status.textContent="Sign in to view your saved symbols.";box.textContent="Your account watchlist appears here after sign-in.";return;}
      const {data:rows,error}=await client.from("user_watchlists").select("symbol").eq("user_id",sessionData.session.user.id).order("created_at",{ascending:true}).limit(6);
      if(error)throw error;
      const symbols=(rows||[]).map(row=>String(row.symbol||"").trim().toUpperCase()).filter(Boolean);
      if(!symbols.length){
        const empty=document.createElement("p");empty.className="overview-empty";empty.textContent="Your watchlist is empty. Add assets to keep them close.";box.append(empty);
        status.textContent="No saved symbols yet.";return;
      }
      const bySymbol=new Map((quotes||[]).map(item=>[item.symbol.replace("USDT",""),item]));
      symbols.forEach(symbol=>{
        const row=document.createElement("a");row.className="overview-watchlist-row";row.href="asset.html?symbol="+encodeURIComponent(symbol);
        const identity=document.createElement("span");identity.className="overview-mover-identity";
        const ticker=document.createElement("strong");ticker.textContent=symbol;
        const name=document.createElement("small");name.textContent=names[symbol+"USDT"]?.[0]||"Saved asset";identity.append(ticker,name);
        const values=document.createElement("span");values.className="overview-mover-values";
        const quote=cryptoSymbols.has(symbol)?bySymbol.get(symbol):null;
        const price=document.createElement("strong");price.textContent=quote&&Number.isFinite(Number(quote.lastPrice))?formatPrice(Number(quote.lastPrice)):"Open details";
        const change=document.createElement("small");change.className=quote?(Number(quote.priceChangePercent)<0?"crypto-change negative":"crypto-change positive"):"";change.textContent=quote?((Number(quote.priceChangePercent)>0?"+":"")+Number(quote.priceChangePercent).toFixed(2)+"%"):"View asset";
        values.append(price,change);row.append(identity,values);box.append(row);
      });
      status.textContent="Showing up to 6 saved symbols from your account.";
    } catch {
      status.textContent="Could not load your watchlist.";
      const err=document.createElement("p");err.className="overview-empty";err.textContent="Your saved symbols could not be loaded. Open Watchlist to retry.";box.append(err);
    }
  }

  (async () => {
    if (!client) { $("#welcome-message").textContent = "Authentication could not load. Refresh to try again."; return; }
    const {data,error} = await client.auth.getSession();
    if (error || !data.session) return login();
    const user = data.session.user;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const display = fullName.trim() || (user.email ? user.email.split("@")[0] : "there");
    $("#welcome-message").textContent = "Welcome, " + display + ". Here is your market overview.";
    $("#account-email").textContent = user.email || "Signed-in account";
    $("#account-email").title = user.email || "";
    $("#account-avatar").textContent = (display[0] || "L").toUpperCase();
    loadSnapshot();
  })();
})();