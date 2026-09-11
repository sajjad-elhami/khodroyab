"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password) {
      setMessage("لطفاً ایمیل و رمز عبور را وارد کنید.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message || "ایمیل یا رمز عبور صحیح نیست.");
        setLoading(false);
        return;
      }

      if (!data.session) {
        setMessage("ورود انجام نشد. لطفاً دوباره تلاش کنید.");
        setLoading(false);
        return;
      }

      const redirectTo = searchParams.get("redirect");
      const safeRedirect =
        redirectTo &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//")
          ? redirectTo
          : "/vehicles";

      // Force a full browser navigation so the newly persisted Supabase
      // auth cookies are sent on the next request and the proxy can see them.
      window.location.assign(safeRedirect);
    } catch (error) {
      console.error("[LOGIN_ERROR]", error);
      setMessage("خطایی هنگام ورود رخ داد. اتصال اینترنت و اطلاعات ورود را بررسی کنید.");
      setLoading(false);
    }
  };

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
        <h1>ورود خودرو‌یاب</h1>

        <input type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, marginTop: 15, borderRadius: 10, border: "1px solid #ddd" }} />
        <input type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") login(); }} style={{ width: "100%", boxSizing: "border-box", padding: 12, marginTop: 10, borderRadius: 10, border: "1px solid #ddd" }} />
        <button onClick={login} disabled={loading} style={{ width: "100%", padding: 12, marginTop: 15, border: 0, borderRadius: 10, background: "#111827", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "در حال ورود..." : "ورود"}
        </button>
        {message && <p style={{ marginTop: 15 }}>{message}</p>}
      </div>
    </main>
  );
}
