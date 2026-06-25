import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { mockApi } from "@/services/mockApi";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormVals = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormVals) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const { token, user } = await mockApi.login(values.email, values.password);
      setSession(token, user);
      toast.success(`Welcome back, ${user.name}`);
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      setServerError(e?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="h-2 bg-primary" />
      <div className="flex min-h-[calc(100dvh-8px)] items-start justify-center px-4 pt-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield size={28} aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">PDM</h1>
            <p className="mt-1 text-sm text-muted-foreground">Police Detail Management</p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="pdm-card space-y-4 p-6"
            noValidate
          >
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
              {serverError && <p className="mt-1 text-xs text-destructive" role="alert">{serverError}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 rounded-md border border-border bg-surface p-3 text-[11px] text-muted-foreground">
            <div className="mb-1 font-medium text-foreground">Demo accounts (password: Test1234!):</div>
            <ul className="space-y-0.5">
              <li>gf@compilecraft.com — Vendor GF</li>
              <li>billing@compilecraft.com — Vendor Billing</li>
              <li>admin@compilecraft.com — Vendor Super Admin</li>
              <li>arborist@nationalgrid.com — NG Arborist</li>
              <li>finance@nationalgrid.com — NG Detail Admin</li>
              <li>super@nationalgrid.com — NG Super Admin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
