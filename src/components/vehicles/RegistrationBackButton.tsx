"use client";

import { useRouter } from "next/navigation";

export default function RegistrationBackButton() {
  const router = useRouter();

  function handleBack() {
    const event = new CustomEvent("khodroyab:registration-back");
    window.dispatchEvent(event);

    window.setTimeout(() => {
      if (!event.defaultPrevented) router.back();
    }, 0);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="مرحله قبل"
      className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[70] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-semibold text-slate-700 shadow-sm backdrop-blur transition active:scale-95"
    >
      →
    </button>
  );
}
