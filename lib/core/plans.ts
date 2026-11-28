// Planned commercial offer. No entitlement or payment is granted by these constants.
// Product decision: no checkout or paid access before the 10.0 billing release.
export const BILLING_RELEASE = Object.freeze({targetMajor:10, paymentsEnabled:false, premiumEnabled:false});
export const PRO_OFFER = Object.freeze({priceTry:249, monthlyBudgetMicrousd:5_000_000});
export const PRO_MODELS = Object.freeze(["openai/gpt-5.6-luna","anthropic/claude-haiku-5.5"] as const);
export const FREE_MODELS = Object.freeze({
 chat:"baidu/ernie-5.5-flash-preview:free",
 reasoning:"nvidia/nemotron-3-ultra-550b-a55b:free",
 code:"particle-ai/particle-1:free",
 recentCode:"recursive/flint-v1.0:free",
 vision:"nvidia/nemotron-3.5-super-vl:free",
 fallback:"google/gemma-4-26b-a4b-it:free",
});
export function modelPriority(query:string,images:number): readonly string[] {
 const normalized=query.toLocaleLowerCase("tr-TR");
 if(images>0)return [FREE_MODELS.vision,FREE_MODELS.fallback];
 if(/\b2026\b/u.test(normalized))return [FREE_MODELS.recentCode];
 if(/\b(kod|code|python|typescript|javascript|debug|programla|programlama|yazılım)\b/u.test(normalized))return [FREE_MODELS.code,FREE_MODELS.recentCode,FREE_MODELS.reasoning,FREE_MODELS.chat,FREE_MODELS.fallback];
 if(/\b(matematik|ispat|denklem|analiz|reasoning|math)\b/u.test(normalized))return [FREE_MODELS.reasoning,FREE_MODELS.chat,FREE_MODELS.fallback];
 return [FREE_MODELS.chat,FREE_MODELS.fallback,FREE_MODELS.reasoning,FREE_MODELS.code,FREE_MODELS.recentCode];
}
export function accountPlan(appMetadata:unknown):"free"|"pro" {
 return appMetadata!==null&&typeof appMetadata==="object"&&(appMetadata as Record<string,unknown>).plan==="pro"?"pro":"free";
}
// Pure reservation check for future atomic DB transaction; never used as an actual wallet.
export function canReservePro(spent:number,reserved:number,next:number):boolean {
 return [spent,reserved,next].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=PRO_OFFER.monthlyBudgetMicrousd)&&spent+reserved+next<=PRO_OFFER.monthlyBudgetMicrousd;
}

// Owner-only display preview; never grants inference, subscription, or credit access.
export function ownerPreviewPlan(verifiedAdmin:unknown):"free"|"pro" {
 return verifiedAdmin === true ? "pro" : "free";
}
