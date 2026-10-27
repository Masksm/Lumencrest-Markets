(() => {
  const $ = selector => document.querySelector(selector);
  const config = window.LUMENCREST_SUPABASE;
  const client = window.supabase?.createClient && config ? window.supabase.createClient(config.url, config.key) : null;
  let userId = null;
  let items = [];
  $("#year").textContent = String(new Date().getFullYear());

  const message = value => { $("#watchlist-error").textContent = value; };

  function render() {
    const box = $("#watchlist-items");
    box.replaceChildren();
    $("#watchlist-empty").hidden = items.length > 0;
    items.forEach(symbol => {
      const row = document.createElement("div");
      row.className = "watchlist-item";
      const label = document.createElement("strong");
      label.className = "watchlist-symbol";
      label.textContent = symbol;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-symbol";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + symbol);
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        const {error} = await client.from("user_watchlists").delete().eq("user_id", userId).eq("symbol", symbol);
        if (error) {
          message("Could not remove that symbol. Try again.");
          remove.disabled = false;
          return;
        }
        items = items.filter(value => value !== symbol);
        render();
        message("Removed from your account.");
      });
      row.append(label, remove);
      box.append(row);
    });
  }

  $("#watchlist-form").addEventListener("submit", async event => {
    event.preventDefault();
    const symbol = $("#watchlist-symbol").value.trim().replace(/\s+/g, " ").toUpperCase();
    if (!symbol) return;
    if (items.includes(symbol)) { message("That symbol is already saved."); return; }
    if (items.length >= 30) { message("Your watchlist is limited to 30 items for now."); return; }
    const {error} = await client.from("user_watchlists").insert({user_id:userId, symbol});
    if (error) {
      message(error.code === "23505" ? "That symbol is already saved." : "Could not save this symbol. Try again.");
      return;
    }
    items.push(symbol);
    $("#watchlist-symbol").value = "";
    render();
    message("Saved to your account.");
  });

  $("#signout-button").addEventListener("click", async () => {
    if (client) await client.auth.signOut();
    location.replace("auth.html");
  });

  if (!client) { message("Authentication could not load. Refresh to retry."); return; }

  client.auth.getSession().then(async ({data, error}) => {
    if (error || !data.session) { location.replace("auth.html"); return; }
    userId = data.session.user.id;
    const {data:rows, error:loadError} = await client.from("user_watchlists")
      .select("symbol").eq("user_id", userId).order("created_at", {ascending:true});
    if (loadError) { message("Could not load your cloud watchlist. Refresh to retry."); return; }
    items = (rows || []).map(row => row.symbol);

    // Import legacy browser-only symbols only when the cloud watchlist is empty.
    let migrated = false;
    if (items.length === 0) {
      let legacy = [];
      try {
        const saved = JSON.parse(localStorage.getItem("lumencrest-watchlist") || "[]");
        if (Array.isArray(saved)) {
          legacy = [...new Set(saved
            .filter(value => typeof value === "string")
            .map(value => value.trim().replace(/\s+/g, " ").toUpperCase())
            .filter(Boolean))].slice(0, 30);
        }
      } catch {}
      if (legacy.length) {
        const {error:migrationError} = await client.from("user_watchlists")
          .insert(legacy.map(symbol => ({user_id:userId, symbol})));
        if (!migrationError) {
          items = legacy;
          migrated = true;
        }
      }
    }
    render();
    message(migrated ? "Your previous watchlist was moved to your account." : "Watchlist synced to your account.");
  });
})();