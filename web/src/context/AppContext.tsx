import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api } from "../api/client";
import { Admin, Branch } from "../api/types";

interface AppContextValue {
  admin: Admin | null;
  token: string | null;
  branches: Branch[];
  selectedBranchId: number | null; // null = "All Branches" (super-admin list views)
  setSelectedBranchId: (id: number | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  reloadBranches: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const raw = localStorage.getItem("admin");
    return raw ? (JSON.parse(raw) as Admin) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem("selectedBranchId");
    return raw ? Number(raw) : null;
  });

  const setSelectedBranchId = useCallback((id: number | null) => {
    setSelectedBranchIdState(id);
    if (id === null) localStorage.removeItem("selectedBranchId");
    else localStorage.setItem("selectedBranchId", String(id));
  }, []);

  const reloadBranches = useCallback(async () => {
    if (!token) return;
    const list = await api.get<Branch[]>("/branches");
    setBranches(list);
  }, [token]);

  useEffect(() => {
    if (token) reloadBranches();
  }, [token, reloadBranches]);

  useEffect(() => {
    if (admin && admin.branchId !== null) {
      setSelectedBranchIdState(admin.branchId);
    }
  }, [admin]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ token: string; admin: Admin }>("/auth/login", { email, password });
    localStorage.setItem("token", result.token);
    localStorage.setItem("admin", JSON.stringify(result.admin));
    setToken(result.token);
    setAdmin(result.admin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    localStorage.removeItem("selectedBranchId");
    setToken(null);
    setAdmin(null);
    setBranches([]);
    setSelectedBranchIdState(null);
  }, []);

  const value = useMemo(
    () => ({ admin, token, branches, selectedBranchId, setSelectedBranchId, login, logout, reloadBranches }),
    [admin, token, branches, selectedBranchId, setSelectedBranchId, login, logout, reloadBranches]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
