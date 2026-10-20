import { Form, redirect, useActionData, useNavigation } from "react-router";
import { createUserSession, getSession } from "~/lib/auth.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Lock, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { AppLogo } from "~/components/app-logo";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("authenticated") === true) {
    return redirect("/dashboard");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = formData.get("password")?.toString();

  const configuredPassword = process.env.APP_PASSWORD;

  if (!configuredPassword) {
    return {
      error: "APP_PASSWORD belum diatur di .env!",
    };
  }

  if (password !== configuredPassword) {
    return {
      error: "Password salah. Akses ditolak.",
    };
  }

  return createUserSession(request);
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <AppLogo size="lg" className="shadow-xs" />
          <h1 className="text-xl font-semibold tracking-tight">ngabsennn</h1>
          <p className="text-xs text-muted-foreground">Daily Intern Report Generator</p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-medium">Autentikasi</CardTitle>
            <CardDescription className="text-xs">
              Masukkan password aplikasi untuk masuk ke workbench laporan.
            </CardDescription>
          </CardHeader>
          <Form method="post">
            <CardContent className="space-y-4">
              {actionData?.error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{actionData.error}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••••••"
                    required
                    autoFocus
                    className="h-9 font-mono text-sm pr-9"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                type="submit"
                size="default"
                className="w-full justify-center gap-2 text-xs font-medium"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? "Memverifikasi..." : "Masuk"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          </Form>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Konfigurasi password dapat diatur melalui file <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.env</code>
        </p>
      </div>
    </div>
  );
}
