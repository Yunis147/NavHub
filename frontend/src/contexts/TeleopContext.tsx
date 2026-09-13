import React, { createContext, useContext } from 'react';

export type TeleopContextType = {
  setTwist: (linear: number, angular: number) => void;
  stop: () => void;
};

const TeleopContext = createContext<TeleopContextType | null>(null);

export function TeleopProvider({ value, children }: { value: TeleopContextType, children: React.ReactNode }) {
  return <TeleopContext.Provider value={value}>{children}</TeleopContext.Provider>;
}

export function useTeleopContext(): TeleopContextType {
  const ctx = useContext(TeleopContext);
  if (!ctx) throw new Error('useTeleopContext must be used within TeleopProvider');
  return ctx;
}