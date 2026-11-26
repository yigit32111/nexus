export const formats=["pdf","docx","xlsx","pptx","zip","csv","md","txt"] as const;
export type ArtifactFormat=typeof formats[number];
export function parseArtifact(raw:string){
 if(raw.length>30000)return null;
 try{const x=JSON.parse(raw);if(!x||typeof x.title!=="string"||typeof x.text!=="string"||!x.text.trim()||x.text.length>24000||!formats.includes(x.format))return null;
 return {title:x.title.slice(0,100),text:x.text,format:x.format as ArtifactFormat}}catch{return null}
}
export type CalcInput={label:string;min:number;max:number;value:number};
export type Calc={title:string;inputs:CalcInput[];operation:"sum"|"product"|"difference"|"ratio";unit:string};
export function parseCalculator(raw:string):Calc|null{
 if(raw.length>8000)return null;
 try{const x=JSON.parse(raw);if(!x||typeof x.title!=="string"||!Array.isArray(x.inputs)||x.inputs.length<2||x.inputs.length>5||!["sum","product","difference","ratio"].includes(x.operation))return null;
 if((x.operation==="difference"||x.operation==="ratio")&&x.inputs.length!==2)return null;
 if(x.inputs.some((v:any)=>!v||typeof v.label!=="string"||![v.min,v.max,v.value].every(n=>typeof n==="number"&&Number.isFinite(n)&&Math.abs(n)<=1e9)||v.min>v.max||v.value<v.min||v.value>v.max))return null;
 return {title:x.title.slice(0,120),inputs:x.inputs.map((v:CalcInput)=>({label:v.label.slice(0,60),min:v.min,max:v.max,value:v.value})),operation:x.operation,unit:typeof x.unit==="string"?x.unit.slice(0,24):""};
 }catch{return null}
}
export function calculate(op:Calc["operation"],values:number[]):number|null{
 if(!values.length||values.some(v=>!Number.isFinite(v)))return null;
 const n=op==="sum"?values.reduce((a,b)=>a+b,0):op==="product"?values.reduce((a,b)=>a*b,1):op==="difference"?values[0]-values[1]:values[0]/values[1];
 return Number.isFinite(n)?n:null
}
