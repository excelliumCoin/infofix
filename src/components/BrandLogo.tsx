"use client";

import Image from "next/image";
import { useState } from "react";

// SSR/CSR aynı kalsın diye sabit sınıf stringleri
const GLOW_BG =
  "pointer-events-none absolute -inset-3 rounded-2xl bg-purple-500/50 blur-2xl opacity-2 " +
  "group-hover:opacity-100 transition-opacity duration-300";

export default function BrandLogo() {
  const [broken, setBroken] = useState(false);

  // Fallback: resim yüklenemezse metin logo
  if (broken) {
    return (
      <div className="group relative flex items-end gap-2 select-none">
        <div className={GLOW_BG} aria-hidden="true" />
        <div className="relative font-semibold text-white">
          <span className="tracking-wide"></span>
          <span className="text-purple-400"></span>
        </div>
        <span className="relative hidden sm:inline text-[10px] text-purple-400 tracking-widest ml-1 translate-y-[2px]">
          
        </span>
      </div>
    );
  }

  return (
    <div className="group relative flex items-end gap-2 select-none">
      {/* Arkadaki sabit glow katmanı (SSR/CSR birebir) */}
      <div className={GLOW_BG} aria-hidden="true" />

      {/* PNG logon: /public/info.png */}
      <Image
        src="/info.png"
        alt="InfoFi[X] — MONAD"
        width={160}
        height={40}
        priority
        onError={() => setBroken(true)}
        className="relative transition-transform duration-200 group-hover:scale-[1.015]"
      />

      <span className="relative hidden sm:inline text-[10px] text-purple-400 tracking-widest ml-1 translate-y-[2px]">
        
      </span>
    </div>
  );
}
