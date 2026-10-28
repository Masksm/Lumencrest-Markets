(() => {
  const $ = selector => document.querySelector(selector);
  const drawer=$("#profile-drawer"), backdrop=$("#profile-menu-backdrop"), toggle=$("#profile-menu-toggle"), close=$("#profile-menu-close");
  if(!drawer||!backdrop||!toggle||!close)return;
  $("#profile-menu-year").textContent=String(new Date().getFullYear());
  const open=()=>{drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");backdrop.hidden=false;toggle.setAttribute("aria-expanded","true");document.body.classList.add("profile-drawer-open");close.focus();};
  const shut=()=>{drawer.classList.remove("open");drawer.setAttribute("aria-hidden","true");backdrop.hidden=true;toggle.setAttribute("aria-expanded","false");document.body.classList.remove("profile-drawer-open");};
  toggle.addEventListener("click",()=>drawer.classList.contains("open")?shut():open());
  close.addEventListener("click",shut);backdrop.addEventListener("click",shut);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&drawer.classList.contains("open")){shut();toggle.focus();}});
  drawer.querySelectorAll("a").forEach(link=>link.addEventListener("click",shut));
  const cfg=window.LUMENCREST_SUPABASE;
  const client=window.supabase?.createClient&&cfg?window.supabase.createClient(cfg.url,cfg.key):null;
  if(client)client.auth.getUser().then(({data})=>{const user=data?.user;if(!user)return;$("#profile-drawer-name").textContent=user.user_metadata?.full_name||user.user_metadata?.name||"Lumencrest profile";$("#profile-drawer-email").textContent=user.email||"Signed-in account";});
})();