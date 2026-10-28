(() => {
  const node=document.querySelector("#header-cash-balance");
  if(!node)return;
  const cfg=window.LUMENCREST_SUPABASE;
  const client=window.supabase?.createClient&&cfg?window.supabase.createClient(cfg.url,cfg.key):null;
  const money=value=>new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  async function load(){
    if(!client){node.textContent="$0.00";node.title="Account balance unavailable";return;}
    try{
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError||!user){node.textContent="$0.00";node.title="Sign in to view your balance";return;}
      const {data,error}=await client.from("user_cash_accounts").select("available_balance,currency,updated_at").eq("user_id",user.id).maybeSingle();
      if(error)throw error;
      if(!data){node.textContent="$0.00";node.title="Cash account is being initialized";return;}
      const balance=Number(data.available_balance);
      if(!Number.isFinite(balance)||balance<0)throw new Error("Invalid account balance");
      node.textContent=money(balance);
      node.title="Available cash balance · "+data.currency+" · Updated "+new Date(data.updated_at).toLocaleString();
      const currency=document.querySelector("#header-cash-currency");if(currency)currency.textContent=data.currency;
    }catch{
      node.textContent="Unavailable";
      node.title="Could not load your account balance";
    }
  }
  load();
  window.addEventListener("focus",load);
})();