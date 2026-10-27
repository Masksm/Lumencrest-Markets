(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const themeIcon = document.querySelector(".theme-icon");
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".primary-nav");
  const year = document.querySelector("#year");

  year.textContent = String(new Date().getFullYear());

  const savedTheme = (() => {
    try { return localStorage.getItem("lumencrest-theme"); } catch { return null; }
  })();
  if (savedTheme === "light" || savedTheme === "dark") {
    root.dataset.theme = savedTheme;
  }

  const updateThemeControl = () => {
    const light = root.dataset.theme === "light";
    themeIcon.textContent = light ? "☾" : "☼";
    themeButton.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    themeButton.title = light ? "Switch to dark theme" : "Switch to light theme";
  };
  updateThemeControl();

  themeButton.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("lumencrest-theme", root.dataset.theme); } catch {}
    updateThemeControl();
  });

  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    nav.classList.toggle("open", open);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
    });
  });
})();