(() => {
  const $ = selector => document.querySelector(selector);
  const config = window.LUMENCREST_SUPABASE;
  const client = window.supabase?.createClient && config ? window.supabase.createClient(config.url, config.key) : null;
  const cryptoAssets = [
    ["BTC","BTCUSDT","Bitcoin"],["ETH","ETHUSDT","Ethereum"],["SOL","SOLUSDT","Solana"],["BNB","BNBUSDT","BNB"],
    ["XRP","XRPUSDT","XRP"],["ADA","ADAUSDT","Cardano"],["DOGE","DOGEUSDT","Dogecoin"],["TRX","TRXUSDT","TRON"],
    ["LINK","LINKUSDT","Chainlink"],["AVAX","AVAXUSDT","Avalanche"]
  ].map(([symbol,pair,name]) => ({symbol,pair,name,type:"crypto"}));
  const stockAssets = [
    ["AAPL","NASDAQ:AAPL","Apple"],["MSFT","NASDAQ:MSFT","Microsoft"],["NVDA","NASDAQ:NVDA","NVIDIA"],
    ["AMZN","NASDAQ:AMZN","Amazon"],["SPX","SP:SPX","S&P 500"]
  ].map(([symbol,chartSymbol,name]) => ({symbol,chartSymbol,name,type:"stock"}));
  const currencies = ["USD","EUR","GBP","JPY","CAD","CHF","AUD"];
  const params = new URLSearchParams(location.search);
  const requested = (params.get("symbol") || "BTC").trim().toUpperCase().replace(/\\s+/g,"");
  const crypto = cryptoAssets.find(item => item.symbol === requested);
  const stock = stockAssets.find(item => item.symbol === requested);
  const pairParts = requested.includes("/") ? requested.split("/") : [];
  const forex = pairParts.length === 2 && currencies.includes(pairParts[0]) && currencies.includes(pairParts[1]) && pairParts[0] !== pairParts[1]
    ? {symbol:pairParts[0]+"/"+pairParts[1],base:pairParts[0],quote:pairParts[1],name:pairParts[0]+"/"+pairParts[1]+" reference rate",type:"forex"}
    : null;
  const asset = crypto || stock || forex;
  let userId = null;
  let saved = false;
  $("#year").textContent = String(new Date().getFullYear());
  const money = n => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:n>=100?2:n>=1?3:5}).format(n);
  const pct = n => (n>0?"+":"")+Number(n).toFixed(2)+"%";
  const login = () => location.replace("auth.html");
  const setTitle = (name,symbol) => {
    document.title = name + " (" + symbol + ") | Lumencrest Markets";
    $("#asset-title").replaceChildren(document.createTextNode(name+" "));
    const ticker=document.createElement("span");ticker.textContent=symbol;$("#asset-title").append(ticker);
  };
  function unsupported() {
    $("#asset-title").textContent = "Asset details unavailable";
    $("#asset-subtitle").textContent = "This symbol is saved, but a supported data source is not connected for it yet.";
    $("#asset-price").textContent = "Not available";
    $("#asset-change").textContent = "No quote is displayed for this symbol.";
    $("#asset-quote-status").textContent = "Supported assets: the listed crypto assets, EUR/USD-style currency pairs, and AAPL, MSFT, NVDA, AMZN or SPX.";
    $("#asset-history-status").textContent = "No chart available for this symbol.";
    $("#asset-chart").textContent = "Choose a supported symbol or return to Markets.";
    $("#asset-source-note").textContent = "Lumencrest does not invent prices for unsupported symbols. You can keep unsupported symbols in your watchlist, but market data will not appear until a provider is connected.";
    $("#asset-watchlist-button").hidden = true;
  }
  function setUpPage() {
    if(!asset){unsupported();return;}
    setTitle(asset.name,asset.symbol);
    $("#asset-subtitle").textContent = asset.type==="crypto"
      ? "Review the latest available spot quote and seven-day historical context for "+asset.name+"."
      : asset.type==="forex"
        ? "Review a daily reference exchange rate for "+asset.symbol+". This is not an intraday trading quote."
        : "Review the chart for "+asset.name+" ("+asset.symbol+") through TradingView. Data timing varies by exchange.";
    $("#asset-disclaimer").textContent = asset.type==="crypto"
      ? "Crypto quotes and four-hour candles come from Binance spot markets and may differ from other venues."
      : asset.type==="forex"
        ? "Frankfurter publishes reference exchange rates, generally based on daily reference data. These are not executable prices."
        : "The stock chart is embedded from TradingView. Data timing and availability depend on the symbol and exchange.";
    $("#asset-source-note").textContent = asset.type==="crypto"
      ? "Quote and four-hour historical candles are sourced from Binance public spot-market endpoints for "+asset.pair+". Binance represents one exchange, not a consolidated global price."
      : asset.type==="forex"
        ? "The "+asset.symbol+" reference rate is requested from Frankfurter using the "+asset.base+" base currency. The rate date is shown beside the quote."
        : "The "+asset.chartSymbol+" chart is provided by TradingView. Lumencrest does not independently verify or redistribute a consolidated stock quote.";
    if(asset.type==="stock"){
      $(".chart-heading strong").textContent="TradingView chart";
      $(".chart-heading small").textContent="Provider chart · data timing varies";
      $(".chart-axis").hidden=true;
    }
    if(asset.type==="forex"){
      $(".chart-heading strong").textContent="Reference-rate context";
      $(".chart-heading small").textContent="Daily reference, not intraday";
      $(".chart-axis").hidden=true;
    }
  }
  $("#signout-button").addEventListener("click",async()=>{if(client)await client.auth.signOut();login();});
  async function loadCryptoQuote(){
    try{
      const response=await fetch("https://data-api.binance.vision/api/v3/ticker/24hr?symbol="+encodeURIComponent(asset.pair),{cache:"no-store"});
      if(!response.ok)throw new Error();
      const quote=await response.json();
      if(!Number.isFinite(Number(quote.lastPrice)))throw new Error();
      $("#asset-price").textContent=money(Number(quote.lastPrice));
      $("#asset-change").textContent="24h change "+pct(Number(quote.priceChangePercent));
      $("#asset-change").className="asset-current-change "+(Number(quote.priceChangePercent)<0?"negative":"positive");
      $("#asset-quote-status").textContent="Quote checked "+new Date().toLocaleTimeString()+" · Binance spot market";
    }catch{$("#asset-quote-status").textContent="Quote temporarily unavailable. Refresh to retry.";}
  }
  async function loadCryptoHistory(){
    const chart=$("#asset-chart");
    try{
      const response=await fetch("https://data-api.binance.vision/api/v3/klines?symbol="+encodeURIComponent(asset.pair)+"&interval=4h&limit=42",{cache:"no-store"});
      if(!response.ok)throw new Error();
      const data=await response.json(),points=data.map(row=>Number(row[4])).filter(Number.isFinite);
      if(points.length<2)throw new Error();
      let min=Math.min(...points),max=Math.max(...points);if(min===max){min*=.999;max*=1.001;}
      const w=640,h=220,p=12,coords=points.map((v,i)=>({x:p+i*(w-p*2)/(points.length-1),y:p+(max-v)*(h-p*2)/(max-min)}));
      const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 "+w+" "+h);svg.setAttribute("preserveAspectRatio","none");svg.setAttribute("class","history-svg");
      [.25,.5,.75].forEach(r=>{const line=document.createElementNS(svg.namespaceURI,"line"),y=p+(h-p*2)*r;line.setAttribute("x1",p);line.setAttribute("x2",w-p);line.setAttribute("y1",y);line.setAttribute("y2",y);line.setAttribute("class","chart-grid-line");svg.append(line);});
      const line=document.createElementNS(svg.namespaceURI,"polyline");line.setAttribute("points",coords.map(point=>point.x+","+point.y).join(" "));line.setAttribute("class","history-line");svg.append(line);
      const last=coords[coords.length-1],dot=document.createElementNS(svg.namespaceURI,"circle");dot.setAttribute("cx",last.x);dot.setAttribute("cy",last.y);dot.setAttribute("r",4);dot.setAttribute("class","history-dot");svg.append(dot);
      chart.replaceChildren(svg);const note=document.createElement("small");note.className="chart-range-note";note.textContent="Observed range: "+money(min)+" to "+money(max)+" · "+points.length+" candles";chart.append(note);
      $("#asset-history-status").textContent="History loaded · Binance four-hour candles.";
    }catch{chart.textContent="Historical chart temporarily unavailable.";$("#asset-history-status").textContent="History unavailable. Refresh to retry.";}
  }
  async function loadForexQuote(){
    try{
      const response=await fetch("https://api.frankfurter.dev/v2/rates?base="+encodeURIComponent(asset.base)+"&quotes="+encodeURIComponent(asset.quote),{cache:"no-store"});
      if(!response.ok)throw new Error();
      const rows=await response.json(),rate=Array.isArray(rows)&&rows[0];
      if(!rate||!Number.isFinite(Number(rate.rate)))throw new Error();
      $("#asset-price").textContent=new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(Number(rate.rate))+" "+asset.quote;
      $("#asset-change").textContent="1 "+asset.base+" = "+new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(Number(rate.rate))+" "+asset.quote;
      $("#asset-quote-status").textContent="Reference rate date: "+rate.date+" · Frankfurter";
      $("#asset-chart").textContent="A historical forex chart is not shown here. This provider supplies reference rates, not intraday market quotes.";
      $("#asset-history-status").textContent="Daily reference rate only.";
    }catch{$("#asset-quote-status").textContent="Reference rate temporarily unavailable. Refresh to retry.";}
  }
  function loadStockChart(){
    $("#asset-price").textContent="See provider chart";
    $("#asset-change").textContent="No separate stock quote API is connected.";
    $("#asset-quote-status").textContent="Chart supplied by TradingView. Price timing may be delayed.";
    const chart=$("#asset-chart");chart.replaceChildren();
    const script=document.createElement("script");
    script.src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async=true;
    script.textContent=JSON.stringify({autosize:true,symbol:asset.chartSymbol,interval:"D",timezone:"Etc/UTC",theme:"dark",style:"1",locale:"en",allow_symbol_change:false,calendar:false,support_host:"https://www.tradingview.com",backgroundColor:"rgba(11,18,32,0)"});
    chart.append(script);
    chart.style.minHeight="420px";
    $("#asset-history-status").textContent="Chart loaded from the TradingView embed.";
  }
  async function syncSavedState(){
    if(!client||!asset)return;
    const {data,error}=await client.auth.getSession();
    if(error||!data.session)return login();
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
  setUpPage();
  if(client)client.auth.getSession().then(({data,error})=>{if(error||!data.session)login();});
  if(asset){
    if(asset.type==="crypto"){loadCryptoQuote();loadCryptoHistory();window.setInterval(loadCryptoQuote,60000);}
    else if(asset.type==="forex")loadForexQuote();
    else loadStockChart();
    syncSavedState();
  }
})();