(() => {
  const form = document.querySelector("#auth-form");
  const tabs = [...document.querySelectorAll(".auth-tab")];
  const title = document.querySelector("#auth-title");
  const subtitle = document.querySelector("#auth-subtitle");
  const nameField = document.querySelector("#name-field");
  const nameInput = document.querySelector("#full-name");
  const emailInput = document.querySelector("#email");
  const passwordInput = document.querySelector("#password");
  const termsField = document.querySelector("#terms-field");
  const termsInput = document.querySelector("#terms");
  const submitButton = document.querySelector("#submit-button");
  const forgotLink = document.querySelector("#forgot-password");
  const switchText = document.querySelector("#auth-switch");
  const notice = document.querySelector("#auth-notice");
  const googleButton = document.querySelector("#google-button");
  const togglePassword = document.querySelector("#toggle-password");
  let mode = "signup";

  document.querySelector("#year").textContent = String(new Date().getFullYear());

  const showNotice = (message, kind = "info") => {
    notice.textContent = message;
    notice.dataset.kind = kind;
    notice.hidden = false;
  };

  const clearNotice = () => {
    notice.textContent = "";
    notice.hidden = true;
    delete notice.dataset.kind;
  };

  const clearErrors = () => {
    document.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
    [nameInput, emailInput, passwordInput].forEach((input) => input.removeAttribute("aria-invalid"));
    termsInput.removeAttribute("aria-invalid");
  };

  const setMode = (nextMode) => {
    mode = nextMode;
    clearErrors();
    clearNotice();
    const signup = mode === "signup";
    title.textContent = signup ? "Create your account" : "Welcome back";
    subtitle.textContent = signup ? "Start building your view of global markets." : "Sign in to continue to your market workspace.";
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));
    nameField.hidden = !signup;
    termsField.hidden = !signup;
    document.querySelector("#terms-error").hidden = !signup;
    forgotLink.hidden = signup;
    passwordInput.autocomplete = signup ? "new-password" : "current-password";
    passwordInput.placeholder = signup ? "At least 8 characters" : "Enter your password";
    submitButton.innerHTML = signup ? 'Create account <span aria-hidden="true">↗</span>' : 'Sign in <span aria-hidden="true">↗</span>';
    document.querySelector("#google-label").textContent = signup ? "Sign up with Google" : "Continue with Google";
    switchText.innerHTML = signup
      ? 'Already have an account? <button type="button" data-switch="login">Sign in</button>'
      : 'New to Lumencrest? <button type="button" data-switch="signup">Create an account</button>';
    switchText.querySelector("button").addEventListener("click", () => setMode(signup ? "login" : "signup"));
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  togglePassword.addEventListener("click", () => {
    const visible = passwordInput.type === "password";
    passwordInput.type = visible ? "text" : "password";
    togglePassword.textContent = visible ? "Hide" : "Show";
    togglePassword.setAttribute("aria-label", visible ? "Hide password" : "Show password");
  });

  forgotLink.addEventListener("click", (event) => {
    event.preventDefault();
    clearNotice();
    showNotice("Password reset will be available once the authentication service is connected. No email has been sent.", "info");
  });

  googleButton.addEventListener("click", () => {
    clearNotice();
    showNotice("Google sign-in is included in the interface, but OAuth is not connected yet. It will work after we configure the authentication provider and approved callback URLs. No sign-in was attempted.", "info");
  });

  const setError = (input, errorId, message) => {
    input.setAttribute("aria-invalid", "true");
    document.querySelector("#" + errorId).textContent = message;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();
    clearNotice();
    let valid = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (mode === "signup" && nameInput.value.trim().length < 2) {
      setError(nameInput, "name-error", "Enter your name (at least 2 characters).");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(emailInput, "email-error", "Enter a valid email address.");
      valid = false;
    }
    if (password.length < 8) {
      setError(passwordInput, "password-error", "Use a password with at least 8 characters.");
      valid = false;
    }
    if (mode === "signup" && !termsInput.checked) {
      termsInput.setAttribute("aria-invalid", "true");
      document.querySelector("#terms-error").textContent = "Please agree before creating an account.";
      valid = false;
    }
    if (!valid) {
      showNotice("Check the highlighted fields and try again.", "error");
      return;
    }
    showNotice("The form looks valid, but account access is not connected to an authentication backend yet. No account was created and no sign-in was attempted.", "info");
  });

  document.querySelectorAll(".placeholder-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showNotice("The Terms of Service and Privacy Policy pages have not been published yet. We should add them before opening registration to the public.", "info");
    });
  });

  setMode("signup");
})();