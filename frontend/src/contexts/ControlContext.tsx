import { createContext, useContext, type ReactNode } from 'react';
import { useControl } from '../hooks/useControl';

type ControlContextType = ReturnType<typeof useControl>;

const ControlContext = createContext<ControlContextType | null>(null);

// There must be exactly one control token for the entire browser application.
// Pages can mount and unmount as routes change, while keyboard teleop and the
// command keepalive must keep using the same token.
export function ControlProvider({ children }: { children: ReactNode }) {
  const control = useControl();
  return <ControlContext.Provider value={control}>{children}</ControlContext.Provider>;
}

export function useControlContext(): ControlContextType {
  const control = useContext(ControlContext);
  if (!control) throw new Error('useControlContext must be used within ControlProvider');
  return control;
}
