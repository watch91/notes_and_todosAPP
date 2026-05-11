// @ts-nocheck
/**
 * 通用认证上下文
 */
import React, { createContext, useContext, ReactNode } from "react";

export interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Placeholder - 实际实现在 src/contexts/AuthContext.tsx
  return (
    <AuthContext.Provider value={{ 
      user: null, 
      token: null, 
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      login: async () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      register: async () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      logout: async () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
