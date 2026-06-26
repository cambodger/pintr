"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two-tap confirmation for destructive form submits: first tap arms the
 * button ("Tap again…"), second tap submits the surrounding form. Re-using
 * the parent <form action={serverAction}> keeps the mutation on the server;
 * this component only adds the arm/disarm state, which needs the client.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  className,
}: {
  label: string;
  confirmLabel: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  // Disarm after a pause so an abandoned first tap can't bite later.
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      ref={ref}
      type={armed ? "submit" : "button"}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
      className={
        className ??
        `text-sm underline-offset-2 hover:underline ${
          armed ? "font-medium text-red-700" : "text-red-600"
        }`
      }
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
