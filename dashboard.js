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
      const pairs = ["BTCUSDT","ETHUSDT","SOLUSDT"];
      const response = await fetch("https://data-api.binance.vision/api/v3/ticker/24hr?symbols=" + encodeURIComponent(JSON.stringify(pairs)), {cache:"no-store"});
      if (!response.ok) throw new Error("Market data unavailable");
      const data = await response.json();
      const names = {BTCUSDT:["Bitcoin","BTC"],ETHUSDT:["Ethereum","ETH"],SOLUSDT:["Solana","SOL"]};
      list.replaceChildren();
      data.filter(item => names[item.symbol] && Number.isFinite(Number(item.lastPrice))).forEach(item => {
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
    } catch {
      status.textContent = "Temporarily unavailable";
      list.textContent = "Crypto quotes could not be loaded. Open Markets to retry.";
      updated.textContent = "Source: Binance public spot-market API.";
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