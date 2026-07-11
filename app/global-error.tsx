"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-[#030812] p-6 text-white">
        <main className="max-w-md text-center">
          <p className="text-sm font-semibold tracking-[.2em] text-cyan-300">
            AIONEX AI
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Something went wrong.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The application encountered an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-7 rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
