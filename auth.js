(() => {
  const $ = (s) => document.querySelector(s);
  const form = $("#auth-form"), tabs = [...document.querySelectorAll(".auth-tab")];
  const nameField = $("#name-field"), nameInput = $("#full-name"), emailInput = $("#email"), passwordInput = $("#password");
  const termsField = $("#terms-field"), termsInput = $("#terms"), submitButton = $("#submit-button");
  const forgotLink = $("#forgot-password"), switchText = $("#auth-switch"), notice = $("#auth-notice");
  const googleButton = $("#google-button"), togglePassword = $("#toggle-password");
  let mode = "signup", busy = false;
  $("#year").textContent = String(new Date().getFullYear());

  const client = window.supabase?.createClient && window.LUMENCREST_SUPABASE
    ? window.supabase.createClient(window.LUMENCREST_SUPABASE.url, window.LUMENCREST_SUPABASE.key)
    : null;

  const showNotice = (message, kind = "info") => { notice.textContent = message; notice.dataset.kind = kind; notice.hidden = false; };
  const clearNotice = () => { notice.textContent = ""; notice.hidden = true; delete notice.dataset.kind; };
  const clearErrors = () => {
    document.querySelectorAll(".field-error").forEach((n) => n.textContent = "");
    [nameInput, emailInput, passwordInput].forEach((n) => n.removeAttribute("aria-invalid"));
    termsInput.removeAttribute("aria-invalid");
  };
  const setError = (input, id, message) => { input.setAttribute("aria-invalid", "true"); $("#" + id).textContent = message; };
  const setBusy = (value) => { busy = value; submitButton.disabled = value; googleButton.disabled = value; };
  const errorText = (e) => {
    const m = String(e?.message || "Something went wrong. Please try again.");
    if (/invalid login credentials/i.test(m)) return "Email or password is incorrect.";
    if (/email not confirmed/i.test(m)) return "Confirm your email using the link we sent before signing in.";
    if (/user already registered/i.test(m)) return "An account already exists for this email. Try signing in instead.";
    if (/rate limit/i.test(m)) return "Too many attempts. Wait a little before trying again.";
    return m;
  };
  const setMode = (next) => {
    mode = next; clearErrors(); clearNotice();
    const signup = mode === "signup";
    $("#auth-title").textContent = signup ? "Create your account" : "Welcome back";
    $("#auth-subtitle").textContent = signup ? "Start building your view of global markets." : "Sign in to continue to your market workspace.";
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.mode === mode)));
    nameField.hidden = !signup; termsField.hidden = !signup; $("#terms-error").hidden = !signup;
    forgotLink.hidden = signup; passwordInput.autocomplete = signup ? "new-password" : "current-password";
    passwordInput.placeholder = signup ? "At least 8 characters" : "Enter your password";
    submitButton.innerHTML = signup ? 'Create account <span aria-hidden="true">↗</span>' : 'Sign in <span aria-hidden="true">↗</span>';
    $("#google-label").textContent = signup ? "Sign up with Google" : "Continue with Google";
    switchText.innerHTML = signup ? 'Already have an account? <button type="button">Sign in</button>' : 'New to Lumencrest? <button type="button">Create an account</button>';
    switchText.querySelector("button").addEventListener("click", () => setMode(signup ? "login" : "signup"));
  };
  tabs.forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));
  togglePassword.addEventListener("click", () => {
    const show = passwordInput.type === "password"; passwordInput.type = show ? "text" : "password";
    togglePassword.textContent = show ? "Hide" : "Show"; togglePassword.setAttribute("aria-label", show ? "Hide password" : "Show password");
  });

  googleButton.addEventListener("click", async () => {
    clearNotice();
    if (!client) return showNotice("Authentication configuration is missing. Refresh later or contact support.", "error");
    setBusy(true); showNotice("Connecting to Google…");
    try {
      const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/auth.html?auth=google" } });
      if (error) throw error;
    } catch (e) { showNotice(errorText(e), "error"); setBusy(false); }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); if (busy) return;
    clearErrors(); clearNotice();
    const email = emailInput.value.trim(), password = passwordInput.value;
    let valid = true;
    if (mode === "signup" && nameInput.value.trim().length < 2) { setError(nameInput, "name-error", "Enter your name (at least 2 characters)."); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(emailInput, "email-error", "Enter a valid email address."); valid = false; }
    if (password.length < 8) { setError(passwordInput, "password-error", "Use a password with at least 8 characters."); valid = false; }
    if (mode === "signup" && !termsInput.checked) { termsInput.setAttribute("aria-invalid", "true"); $("#terms-error").textContent = "Please agree before creating an account."; valid = false; }
    if (!valid) return showNotice("Check the highlighted fields and try again.", "error");
    if (!client) return showNotice("Authentication configuration is missing. Refresh later or contact support.", "error");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: nameInput.value.trim() }, emailRedirectTo: location.origin + "/auth.html?auth=confirmed" } });
        if (error) throw error;
        showNotice(data.session ? "Account created and signed in." : "Account request received. Check your email to confirm your address.", "success");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showNotice("Signed in successfully. Your session is active in this browser.", "success");
      }
    } catch (e) { showNotice(errorText(e), "error"); } finally { setBusy(false); }
  });

  forgotLink.addEventListener("click", async (event) => {
    event.preventDefault(); clearNotice();
    if (!client) return showNotice("Authentication configuration is missing.", "error");
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(emailInput, "email-error", "Enter your email address first.");
    setBusy(true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/auth.html?auth=recovery" });
      if (error) throw error;
      showNotice("If an account exists for this address, a password-reset email will be sent.", "success");
    } catch (e) { showNotice(errorText(e), "error"); } finally { setBusy(false); }
  });

  document.querySelectorAll(".placeholder-link").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault(); showNotice("Terms of Service and Privacy Policy pages are not published yet. Publish them before opening registration to the public.", "info");
  }));
  setMode("signup");
  (async () => {
    if (!client) return showNotice("Authentication configuration is missing. The forms are ready, but sign-in cannot run until the Supabase URL and publishable key are configured.", "error");
    const params = new URLSearchParams(location.search), { data, error } = await client.auth.getSession();
    if (error) return showNotice(errorText(error), "error");
    if (data.session) showNotice("You're signed in" + (data.session.user?.email ? " as " + data.session.user.email : "") + ".", "success");
    else if (params.get("auth") === "confirmed") { setMode("login"); showNotice("Email confirmed. Sign in with your email and password.", "success"); }
    else if (params.get("auth") === "recovery") showNotice("Password recovery link opened. Password update flow still needs to be completed.", "info");
    else if (params.get("error_description")) showNotice(params.get("error_description").replace(/\+/g, " "), "error");
  })();
})();