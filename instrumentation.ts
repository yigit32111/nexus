import type { Instrumentation } from "next";

// Intentionally discard the error, request and context provided by Next.
export const onRequestError:Instrumentation.onRequestError=async()=>{
  if(process.env.NEXT_RUNTIME!=="nodejs")return;
  try{
    const {reportTechnicalEvent}=await import("./lib/core/technical-monitor");
    await reportTechnicalEvent("NEXT_SERVER_ERROR");
  }catch{/* monitoring must never break application error handling */}
};
