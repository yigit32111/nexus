"use client";

import { useRef } from "react";
import { PRO_OFFER } from "../lib/core/plans";

export function ProPaymentPreview() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="plans-action plans-primary" aria-haspopup="dialog"
      onClick={() => dialog.current?.showModal()}>
      Ödeme önizlemesini gör
    </button>
    <dialog ref={dialog} className="plans-card plans-preview-dialog" aria-labelledby="checkout-title">
      <h2 id="checkout-title">Ödeme özeti</h2>
      <p>Planlanan fiyat <strong>{PRO_OFFER.priceTry} TL</strong> / ay.</p>
      <p>Öngörülen aylık model bütçesi {PRO_OFFER.monthlyBudgetMicrousd / 1_000_000} USD.</p>
      <p>Ödeme ve Pro aktivasyonu henüz açılmadı.</p>
      <button type="button" className="plans-action plans-disabled" disabled>Ödeme kapalı — NEXUS 10.0</button>
      <button type="button" className="plans-action plans-secondary"
        onClick={() => dialog.current?.close()}>Kapat</button>
    </dialog>
  </>;
}
