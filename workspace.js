(() => {
  const config = window.LUMENCREST_SUPABASE;
  const client = window.supabase?.createClient && config
    ? window.supabase.createClient(config.url, config.key)
    : null;
  window.LumencrestWorkspace = { client };

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  const button = document.querySelector("#signout-button");
  if (button) {
    button.addEventListener("click", async () => {
      if (!client) {
        window.location.replace("auth.html");
        return;
      }
      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = "Signing out…";
      try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.replace("auth.html");
      } catch (error) {
        button.disabled = false;
        button.textContent = originalText || "Sign out";
        window.alert("Could not sign out: " + (error?.message || "Please try again."));
      }
    });
  }
})();