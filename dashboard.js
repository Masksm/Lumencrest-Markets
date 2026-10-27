(() => {
 const $ = s => document.querySelector(s);
 const client = window.supabase?.createClient && window.LUMENCREST_SUPABASE ? window.supabase.createClient(window.LUMENCREST_SUPABASE.url, window.LUMENCREST_SUPABASE.key) : null;
 const login = () => window.location.replace("auth.html");
 $("#year").textContent = String(new Date().getFullYear());
 $("#today-date").textContent = new Intl.DateTimeFormat(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"}).format(new Date());
 let symbols = [];
 try { const saved = JSON.parse(localStorage.getItem("lumencrest-watchlist") || "[]"); symbols = Array.isArray(saved) ? saved.filter(v => typeof v === "string") : []; } catch {}
 const render = () => {
   const list = $("#watchlist-items"); list.replaceChildren(); $("#watchlist-empty").hidden = symbols.length > 0;
   symbols.forEach(symbol => {
     const item = document.createElement("div"); item.className = "watchlist-item";
     const details = document.createElement("div"), name = document.createElement("strong"), note = document.createElement("small");
     name.className = "watchlist-symbol"; name.textContent = symbol; note.className = "watchlist-item-note"; note.textContent = "Price data not connected"; details.append(name,note);
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
})();