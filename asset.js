(() => {
  const $ = selector => document.querySelector(selector);
  const config = window.LUMENCREST_SUPABASE;
  const client = window.supabase?.createClient && config ? window.supabase.createClient(config.url, config.key) : null;
  const assets = [
    ["BTC","BTCUSDT","Bitcoin"],["ETH","ETHUSDT","Ethereum"],["SOL","SOLUSDT","Solana"],["BNB","BNBUSDT","BNB"],
    ["XRP","XRPUSDT","XRP"],["ADA","ADAUSDT","Cardano"],["DOGE","DOGEUSDT","Dogecoin"],["TRX","TRXUSDT","TRON"],
    ["LINK","LINKUSDT","Chainlink"],["AVAX","AVAXUSDT","Avalanche"]
  ].map(([symbol,pair,name]) => ({symbol,pair,name}));
  const params = new URLSearchParams(location.search);
  const requested = (params.get("symbol") || "BTC").trim().toUpperCase();
  const asset = assets.find(item => item.symbol === requested);
  let userId = null;
  let saved = false;
  $("#year").textContent = String(new Date().getFullYear());
  const money = n => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:n>=100?2:n>=1?3:5}).format(n);
  const pct = n => (n>0?"+":"")+Number(n).toFixed(2)+"%";
  const login = () => location.replace("auth.html");
  if (!asset) {
    $("#asset-title").textContent = "Asset not supported";
    $("#asset-subtitle").textContent = "This detail view currently supports the crypto assets listed in Markets.";
    $("#asset-quote-status").textContent = "No quote requested.";
    $("#asset-history-status").textContent = "No historical data requested.";
    $("#asset-source-note").textContent = "Supported assets are listed on the Markets page. Broader stock and forex detail pages will be added after their data sources are connected.";
    $("#asset-watchlist-button").hidden = true;
  } else {
    document.title = asset.name + " (" + asset.symbol + ") | Lumencrest Markets";
    $("#asset-title").replaceChildren(document.createTextNode(asset.name + " "));
    const ticker = document.createElement("span"); ticker.textContent = asset.symbol; $("#asset-title").append(ticker);
    $("#asset-subtitle").textContent = "Review the latest available spot quote and seven-day historical context for " + asset.name + ".";
    $("#asset-source-note").textContent = "Quote and four-hour historical candles are sourced from Binance public spot-market endpoints for " + asset.pair + ". Binance represents one exchange, not a consolidated global price.";
  }
  $("#signout-button").addEventListener("click", async () => { if(client) await client.auth.signOut(); login(); });
  async function loadQuote() {
    if(!asset) return;
    try {
      const response = await fetch("https://data-api.binance.vision/api/v3/ticker/24hr?symbol="+encodeURIComponent(asset.pair),{cache:"no-store"});
      if(!response.ok) throw new Error();
      const quote = await response.json();
      if(!Number.isFinite(Number(quote.lastPrice))) throw new Error();
      $("#asset-price").textContent = money(Number(quote.lastPrice));
      $("#asset-change").textContent = "24h change " + pct(Number(quote.priceChangePercent));
      $("#asset-change").className = "asset-current-change " + (Number(quote.priceChangePercent)<0?"negative":"positive");
      $("#asset-quote-status").textContent = "Quote checked " + new Date().toLocaleTimeString() + " · Binance spot market";
    } catch { $("#asset-quote-status").textContent = "Quote temporarily unavailable. Refresh to retry."; }
  }
  async function loadHistory() {
    if(!asset) return;
    const chart=$("#asset-chart");
    try {
      const response=await fetch("https://data-api.binance.vision/api/v3/klines?symbol="+encodeURIComponent(asset.pair)+"&interval=4h&limit=42",{cache:"no-store"});
      if(!response.ok) throw new Error();
      const data=await response.json(),points=data.map(row=>Number(row[4])).filter(Number.isFinite);
      if(points.length<2) throw new Error();
      let min=Math.min(...points),max=Math.max(...points);if(min===max){min*=.999;max*=1.001;}
      const w=640,h=220,p=12,coords=points.map((v,i)=>({x:p+i*(w-p*2)/(points.length-1),y:p+(max-v)*(h-p*2)/(max-min)}));
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 "+w+" "+h);svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("class","history-svg");
      [.25,.5,.75].forEach(r=>{const line=document.createElementNS(svg.namespaceURI,"line"),y=p+(h-p*2)*r;line.setAttribute("x1",p);line.setAttribute("x2",w-p);line.setAttribute("y1",y);line.setAttribute("y2",y);line.setAttribute("class","chart-grid-line");svg.append(line);});
      const line=document.createElementNS(svg.namespaceURI,"polyline");line.setAttribute("points",coords.map(point=>point.x+","+point.y).join(" "));line.setAttribute("class","history-line");svg.append(line);
      const last=coords[coords.length-1],dot=document.createElementNS(svg.namespaceURI,"circle");dot.setAttribute("cx",last.x);dot.setAttribute("cy",last.y);dot.setAttribute("r",4);dot.setAttribute("class","history-dot");svg.append(dot);
      chart.replaceChildren(svg);const note=document.createElement("small");note.className="chart-range-note";note.textContent="Observed range: "+money(min)+" to "+money(max)+" · "+points.length+" candles";chart.append(note);
      $("#asset-history-status").textContent="Historical data loaded from Binance.";
    } catch { chart.textContent="Historical chart temporarily unavailable.";$("#asset-history-status").textContent="History unavailable. Refresh to retry."; }
  }
  async function syncSavedState() {
    if(!client || !asset) return;
    const {data,error}=await client.auth.getSession();
    if(error || !data.session) return login();
    userId=data.session.user.id;
    const result=await client.from("user_watchlists").select("symbol").eq("user_id",userId).eq("symbol",asset.symbol).maybeSingle();
    if(result.error){$("#asset-watchlist-status").textContent="Could not check your saved symbols.";return;}
    saved=!!result.data;
    const button=$("#asset-watchlist-button");button.disabled=false;button.textContent=saved?"Added to watchlist":"＋ Add "+asset.symbol+" to watchlist";
  }
  $("#asset-watchlist-button").addEventListener("click",async()=>{
    const button=$("#asset-watchlist-button");if(!asset||!client||!userId||saved)return;
    button.disabled=true;$("#asset-watchlist-status").textContent="Saving to your account…";
    const {error}=await client.from("user_watchlists").insert({user_id:userId,symbol:asset.symbol});
    if(error){$("#asset-watchlist-status").textContent=error.code==="23505"?"This asset is already saved.":"Could not save this asset. Try again.";button.disabled=false;return;}
    saved=true;button.textContent="Added to watchlist";$("#asset-watchlist-status").textContent="Saved to your account watchlist.";
  });
  if(client) client.auth.getSession().then(({data,error})=>{if(error||!data.session)login();});
  if(asset){loadQuote();loadHistory();syncSavedState();window.setInterval(loadQuote,60000);}
})();