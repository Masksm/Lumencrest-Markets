(() => {
  const $ = selector => document.querySelector(selector);
  const config = window.LUMENCREST_SUPABASE;
  const client = window.supabase?.createClient && config ? window.supabase.createClient(config.url, config.key) : null;
  const pairs = {BTC:"BTCUSDT",ETH:"ETHUSDT",SOL:"SOLUSDT",BNB:"BNBUSDT",XRP:"XRPUSDT",ADA:"ADAUSDT",DOGE:"DOGEUSDT",TRX:"TRXUSDT",LINK:"LINKUSDT",AVAX:"AVAXUSDT"};
  const names = {BTC:"Bitcoin",ETH:"Ethereum",SOL:"Solana",BNB:"BNB",XRP:"XRP",ADA:"Cardano",DOGE:"Dogecoin",TRX:"TRON",LINK:"Chainlink",AVAX:"Avalanche"};
  let userId = null, positions = [];
  const prices = new Map();
  $("#year").textContent = String(new Date().getFullYear());
  const say = value => { $("#portfolio-message").textContent = value; };
  const usd = value => new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}).format(value);
  const qtyText = value => Number(value).toLocaleString(undefined,{maximumFractionDigits:10});
  const pnlClass = value => value > 0 ? "positive" : value < 0 ? "negative" : "";
  const signedUsd = value => (value > 0 ? "+" : "") + usd(value);
  async function loadPrices() {
    await Promise.all(Object.entries(pairs).map(async ([symbol,pair]) => {
      try {
        const response = await fetch("https://data-api.binance.vision/api/v3/ticker/price?symbol=" + pair,{cache:"no-store"});
        if (!response.ok) throw new Error("Quote unavailable");
        const data = await response.json(), price = Number(data.price);
        if (Number.isFinite(price) && price > 0) prices.set(symbol,price);
      } catch {}
    }));
  }
  function render() {
    const body = $("#portfolio-rows"); body.replaceChildren();
    let totalValue=0,totalCost=0,pricedCost=0,pricedValue=0,pricedCount=0;
    positions.forEach(position => {
      const quantity=Number(position.quantity),cost=Number(position.average_cost_usd),basis=quantity*cost,price=prices.get(position.symbol);
      totalCost+=basis;
      const row=document.createElement("tr"),asset=document.createElement("td"),ticker=document.createElement("strong"),name=document.createElement("small");
      ticker.textContent=position.symbol;name.className="portfolio-asset-name";name.textContent=names[position.symbol]||position.symbol;asset.append(ticker,name);
      const qty=document.createElement("td");qty.textContent=qtyText(quantity);
      const valueCell=document.createElement("td"),pnlCell=document.createElement("td");
      if(Number.isFinite(price)){const value=quantity*price,pnl=value-basis;totalValue+=value;pricedValue+=value;pricedCost+=basis;pricedCount++;valueCell.textContent=usd(value);pnlCell.textContent=signedUsd(pnl);pnlCell.className=pnlClass(pnl);pnlCell.title="Average cost: "+usd(cost)+" per unit";}
      else{valueCell.textContent="Unavailable";pnlCell.textContent="Unavailable";}
      const action=document.createElement("td"),remove=document.createElement("button");remove.type="button";remove.className="remove-symbol";remove.textContent="×";remove.setAttribute("aria-label","Remove "+position.symbol+" position");
      remove.addEventListener("click",async()=>{remove.disabled=true;const {error}=await client.from("user_crypto_positions").delete().eq("user_id",userId).eq("symbol",position.symbol);if(error){say("Could not remove this position. Try again.");remove.disabled=false;return;}positions=positions.filter(item=>item.symbol!==position.symbol);render();say(position.symbol+" position removed.");});
      action.append(remove);row.append(asset,qty,valueCell,pnlCell,action);body.append(row);
    });
    if(!positions.length){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=5;cell.textContent="No positions saved yet. Add a holding to start tracking your portfolio.";row.append(cell);body.append(row);}
    $("#positions-count").textContent=positions.length+(positions.length===1?" asset":" assets");
    $("#portfolio-cost-basis").textContent=usd(totalCost);
    $("#portfolio-market-value").textContent=pricedCount?usd(totalValue):positions.length?"Unavailable":usd(0);
    const pnl=pricedValue-pricedCost;$("#portfolio-profit-loss").textContent=pricedCount?signedUsd(pnl):positions.length?"Unavailable":usd(0);
    $("#portfolio-profit-loss").className="portfolio-summary-number "+pnlClass(pnl);
    const percent=pricedCost>0?(pnl/pricedCost)*100:null;
    $("#portfolio-profit-percent").textContent=percent===null||!pricedCount?"Available for positions with live quotes":(percent>0?"+":"")+percent.toFixed(2)+"% against cost basis of priced positions";
    $("#portfolio-market-status").textContent=pricedCount+" of "+positions.length+" positions priced from live quotes";
  }
  $("#position-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!client||!userId)return;
    const symbol=$("#position-symbol").value,quantity=Number($("#position-quantity").value),cost=Number($("#position-cost").value);
    if(!pairs[symbol]||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(cost)||cost<0){say("Enter a supported asset, positive quantity and valid average purchase cost.");return;}
    const button=$("#position-save");button.disabled=true;button.textContent="Saving…";
    const {error}=await client.from("user_crypto_positions").upsert({user_id:userId,symbol,quantity,average_cost_usd:cost,updated_at:new Date().toISOString()},{onConflict:"user_id,symbol"});
    button.disabled=false;button.textContent="Save position";
    if(error){say("Could not save this position. "+(error.code==="42501"?"Check your account permissions.":"Try again."));return;}
    $("#position-quantity").value="";$("#position-cost").value="";
    const {data,error:loadError}=await client.from("user_crypto_positions").select("id,symbol,quantity,average_cost_usd,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:true});
    if(loadError){say("Saved, but the list could not refresh. Reload this page.");return;}
    positions=data||[];render();say(symbol+" position saved to your account.");
  });
  $("#signout-button").addEventListener("click",async()=>{if(client){const {error}=await client.auth.signOut();if(error){say("Could not sign out. Try again.");return;}}location.replace("auth.html");});
  async function start(){
    if(!client){say("Authentication could not load. Refresh to retry.");return;}
    const {data,error}=await client.auth.getSession();if(error||!data.session){location.replace("auth.html");return;}
    userId=data.session.user.id;
    const {data:rows,error:loadError}=await client.from("user_crypto_positions").select("id,symbol,quantity,average_cost_usd,created_at,updated_at").eq("user_id",userId).order("created_at",{ascending:true});
    if(loadError){say("Could not load your positions. Refresh to retry.");return;}
    positions=rows||[];await loadPrices();render();say("Portfolio synced to your account.");
  }
  start();
})();