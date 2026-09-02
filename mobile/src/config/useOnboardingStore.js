/**
 * useOnboardingStore.js
 * ──────────────────────
 * Lightweight React Context store that carries data across all setup steps
 * without prop drilling or a third-party state manager.
 *
 * Wrap your setup layout with <OnboardingProvider> and consume anywhere
 * with useOnboarding().
 */
import React, { createContext, useContext, useState } from "react";

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [data, setData] = useState({
    role:        null,   // 'poster' | 'tasker'
    phoneNumber: "",     // E.164 cleaned string
    firstName:   "",
    lastName:    "",
    location:    "",
    categories:  [],     // string[]
  });

  /** Merge a partial update into the store */
  const update = (partial) =>
    setData((prev) => ({ ...prev, ...partial }));

  /** Reset everything (e.g. on error) */
  const reset = () =>
    setData({
      role:        null,
      phoneNumber: "",
      firstName:   "",
      lastName:    "",
      location:    "",
      categories:  [],
    });

  return (
    <OnboardingContext.Provider value={{ data, update, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used inside <OnboardingProvider>");
  }
  return ctx;
}
