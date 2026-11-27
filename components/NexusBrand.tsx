import Image from "next/image";

export function NexusLogo({size=64,className="",decorative=false}:{size?:number;className?:string;decorative?:boolean}) {
  return <Image src="/icon.svg" alt={decorative?"":"NEXUS logosu"} width={size} height={size} unoptimized className={`nexus-logo ${className}`} />;
}

export function NexusSplash() {
  return (
    <main className="loading-screen nexus-splash">
      <div className="loading-mark" role="status" aria-live="polite">
        <div className="nexus-splash-logo"><NexusLogo size={104}/></div>
        <div className="nexus-splash-word">NEXUS <span>AI</span></div>
        <h1>Hoş geldin.</h1>
        <p>Çalışma alanın hazırlanıyor…</p>
        <div className="nexus-progress" aria-hidden="true"><span/></div>
        <small className="nexus-splash-version">5.1.2</small>
      </div>
    </main>
  );
}
