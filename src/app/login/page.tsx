import { Suspense } from "react";
import LoginForm from "./LoginForm";

function LoginFallback() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fa",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          padding: 30,
          borderRadius: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        در حال بارگذاری...
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
