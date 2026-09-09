"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

type AdminUserContextValue = {
  fullName: string;
};

const AdminUserContext = createContext<AdminUserContextValue>({
  fullName: "مدیر سیستم",
});

export function AdminUserProvider({
  children,
  fullName,
}: {
  children: ReactNode;
  fullName: string;
}) {
  return (
    <AdminUserContext.Provider value={{ fullName }}>
      {children}
    </AdminUserContext.Provider>
  );
}

export function useAdminUser() {
  return useContext(AdminUserContext);
}
