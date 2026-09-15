import React, { createContext, useContext } from 'react';
import type { Twist2D } from '../services/cmdVel';

export type TeleopContextType = {
  setTwist: (t: Twist2D) => void;
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
