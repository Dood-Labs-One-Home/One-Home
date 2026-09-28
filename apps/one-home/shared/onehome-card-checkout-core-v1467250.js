// One Home shared Square card checkout client (sandbox integration).
// Product-specific rooms supply their own adapter for order preparation and fulfillment.
// This component never embeds a product price, Passport identity, or Square secret.
(()=>{
'use strict';
function create({invoke,square=()=>window.Square,requireSandbox=true,paymentFunction='onehome-square-card-payment'}={}){
  if(typeof invoke!=='function')throw new Error('One Home payment gateway is not configured.');
  const state=orderId=>invoke(paymentFunction,{action:'checkout_state',order_id:orderId});
  return Object.freeze({
    async config(){
      const cfg=await invoke(paymentFunction,{action:'config'});
      if(requireSandbox&&(cfg?.environment!=='sandbox'||!String(cfg?.application_id||'').startsWith('sandbox-'))){
        throw new Error('Square Sandbox configuration was not verified. Checkout is disabled.');
      }
      if(!cfg?.application_id||!cfg?.location_id)throw new Error('Square configuration is incomplete.');
      return cfg;
    },
    state,
    async mountCard(cfg,selector){
      if(!window.isSecureContext||location.protocol!=='https:')throw new Error('This card form requires trusted HTTPS. Restart the OH-250 secure launcher.');
      if(!square())throw new Error('Square SDK did not load. Check your internet connection.');
      const payments=square().payments(cfg.application_id,cfg.location_id);
      const card=await payments.card();
      await card.attach(selector);
      return card;
    },
    async charge({card,order,email,onSubmitting=()=>{}}){
      if(!card||!order?.id||!Number.isSafeInteger(Number(order.amount_cents))||Number(order.amount_cents)<=0){
        throw new Error('A valid server-owned order is required.');
      }
      const details={
        amount:(Number(order.amount_cents)/100).toFixed(2),
        currencyCode:order.currency||'USD',intent:'CHARGE',
        customerInitiated:true,sellerKeyedIn:false,
        billingContact:{email:email||undefined,countryCode:'US'}
      };
      // Square-hosted fields tokenize the card; One Home does not read the card number.
      const tr=await card.tokenize(details);
      if(tr?.status!=='OK'||!tr?.token){
        const errors=Array.isArray(tr?.errors)?tr.errors:[];
        const names={cardNumber:'card number',cvv:'CVV',expirationDate:'expiration date',postalCode:'postal code'};
        const fields=[...new Set(errors.map(e=>names[e?.field]||'card details'))];
        const error=new Error(fields.length?`Please correct your ${fields.join(', ')}. No payment was attempted.`:'Check the card number, expiration date, CVV, and postal code. No payment was attempted.');
        error.cardValidation=true;
        error.fields=errors.map(e=>({field:e.field||'unknown',type:e.type||'VALIDATION_ERROR'}));
        throw error;
      }
      onSubmitting();
      return invoke(paymentFunction,{
        action:'create_payment',order_id:order.id,source_id:tr.token,request_id:crypto.randomUUID()
      });
    }
  });
}
window.OneHomeCardCheckout=Object.freeze({create});
})();
