"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  completePasswordReset,
  login,
  verifyResetEmail,
} from "@/lib/actions/auth";
import {
  type ForgotPasswordValues,
  forgotPasswordSchema,
  type LoginValues,
  loginSchema,
  type ResetPasswordValues,
  resetPasswordSchema,
} from "@/lib/validations/auth";

type Mode = "login" | "forgot" | "reset";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
      {message}
    </p>
  );
}

function LoginForm({
  onForgot,
  notice,
}: {
  onForgot: () => void;
  notice: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await login(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {notice && (
        <p className="bg-accent text-accent-foreground rounded-md px-3 py-2 text-xs">
          {notice}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="identifier">Email or Phone Number</Label>
        <Input
          id="identifier"
          autoComplete="username"
          placeholder="you@example.com"
          className="h-10 rounded-lg text-sm"
          {...form.register("identifier")}
        />
        <FieldError message={form.formState.errors.identifier?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-10 rounded-lg pr-10 text-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center cursor-pointer transition-colors focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <FieldError message={form.formState.errors.password?.message} />
      </div>

      <FormError message={formError} />

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg font-medium cursor-pointer"
      >
        {isPending && <Loader2 className="animate-spin" />}
        Sign In
      </Button>

      <button
        type="button"
        onClick={onForgot}
        className="text-primary hover:text-primary/80 block w-full text-center text-xs font-medium hover:underline cursor-pointer transition-colors"
      >
        Forgot password?
      </button>
    </form>
  );
}

/** Step 1: name the account, which must already exist to continue. */
function ForgotPasswordForm({
  onVerified,
  onBack,
}: {
  onVerified: (email: string) => void;
  onBack: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await verifyResetEmail(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      onVerified(values.email);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          className="h-10 rounded-lg text-sm"
          {...form.register("email")}
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      <FormError message={formError} />

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg font-medium cursor-pointer"
      >
        {isPending && <Loader2 className="animate-spin" />}
        Continue
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="text-primary hover:text-primary/80 block w-full text-center text-xs font-medium hover:underline cursor-pointer transition-colors"
      >
        Back to sign in
      </button>
    </form>
  );
}

/** Step 2: the new password for the email verified in step 1. */
function ResetPasswordForm({
  email,
  onDone,
  onBack,
}: {
  email: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email, newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await completePasswordReset(values);

      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      onDone();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="reset-account">Email</Label>
        <Input
          id="reset-account"
          value={email}
          readOnly
          disabled
          className="h-10 rounded-lg text-sm bg-muted/50"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            className="h-10 rounded-lg pr-10 text-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
            {...form.register("newPassword")}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={showNewPassword ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center cursor-pointer transition-colors focus:outline-none"
          >
            {showNewPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <FieldError message={form.formState.errors.newPassword?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            className="h-10 rounded-lg pr-10 text-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
            {...form.register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center cursor-pointer transition-colors focus:outline-none"
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <FieldError message={form.formState.errors.confirmPassword?.message} />
      </div>

      <FormError message={formError} />

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg font-medium cursor-pointer"
      >
        {isPending && <Loader2 className="animate-spin" />}
        Update Password
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="text-primary hover:text-primary/80 block w-full text-center text-xs font-medium hover:underline cursor-pointer transition-colors"
      >
        Back to sign in
      </button>
    </form>
  );
}

const HEADINGS: Record<Mode, { title: string; subtitle: string }> = {
  login: {
    title: "Sign in",
    subtitle: "Use your email or phone number to continue.",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "Enter the email address on your account to continue.",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "Pick something you haven't used before.",
  },
};

function LoginView() {
  const [mode, setMode] = useState<Mode>("login");
  const [resetEmail, setResetEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const backToLogin = () => {
    setMode("login");
    setResetEmail("");
  };

  const heading = HEADINGS[mode];

  return (
    <main className="bg-background flex h-full w-full flex-col items-center justify-center overflow-y-auto p-4 py-8 sm:p-6 md:p-8">
      <div className="w-full max-w-[440px]">
        {/* Branding */}
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="bg-brand flex size-12 items-center justify-center rounded-xl text-white shadow-xs">
            <Zap className="size-6 text-white" />
          </div>
          <h1 className="text-foreground mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
            ServiceDesk 360
          </h1>
          <p className="text-muted-foreground mt-0.5 text-[10px] font-semibold tracking-wider uppercase sm:text-[11px]">
            Service Platform
          </p>
        </div>

        {/* Card */}
        <div className="border-border bg-card w-full rounded-2xl border p-6 shadow-sm sm:p-8">
          <h2 className="text-foreground text-xl font-extrabold">
            {heading.title}
          </h2>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            {heading.subtitle}
          </p>

          {mode === "login" && (
            <LoginForm
              notice={notice}
              onForgot={() => {
                setNotice(null);
                setMode("forgot");
              }}
            />
          )}

          {mode === "forgot" && (
            <ForgotPasswordForm
              onVerified={(email) => {
                setResetEmail(email);
                setMode("reset");
              }}
              onBack={backToLogin}
            />
          )}

          {mode === "reset" && (
            <ResetPasswordForm
              email={resetEmail}
              onDone={() => {
                setNotice("Password updated. Sign in with your new password.");
                backToLogin();
              }}
              onBack={backToLogin}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export { LoginView };
