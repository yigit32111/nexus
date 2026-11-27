export const ACCENTS=[
 {id:"ocean",label:"Okyanus",swatch:"#83d9f6"},
 {id:"lavender",label:"Lavanta",swatch:"#c7b5ff"},
 {id:"sage",label:"Adaçayı",swatch:"#a6d8b8"},
] as const;
export type Appearance={accent:typeof ACCENTS[number]["id"];density:"comfortable"|"compact";motion:"normal"|"reduced"};
export function normalizeAppearance(value:unknown):Appearance{
 const v=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
 return {accent:v.accent==="lavender"||v.accent==="sage"?v.accent:"ocean",density:v.density==="compact"?"compact":"comfortable",motion:v.motion==="reduced"?"reduced":"normal"};
}
