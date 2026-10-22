import { Form, redirect, useActionData, useNavigation } from "react-router";
import { createUserSession, getSession } from "~/lib/auth.server";
import { authenticateKemnakerMonev } from "~/lib/kemnaker-auth.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Lock, Mail, ArrowRight, ShieldAlert, CheckCircle2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AppLogo } from "~/components/app-logo";
import { ThemeToggle } from "~/components/theme-toggle";
import type { Route } from "./+types/login";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("authenticated") === true && session.get("monev_access_token")) {
    return redirect("/dashboard");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() || "";
  const password = formData.get("password")?.toString() || "";

  if (!email || !password) {
    return {
      error: "Email dan password Kemnaker wajib diisi.",
    };
  }

  const authResult = await authenticateKemnakerMonev({ email, password });

  if (!authResult.success || !authResult.access_token) {
    return {
      error: authResult.error || "Gagal masuk. Periksa email dan password akun Kemnaker Anda.",
    };
  }

  return createUserSession(request, {
    userId: authResult.user_id || "",
    name: authResult.name || "Peserta Magang",
    accessToken: authResult.access_token,
    refreshToken: authResult.refresh_token,
  });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-1.5 text-center">
          <AppLogo size="lg" className="shadow-xs" />
          <h1 className="text-xl font-semibold tracking-tight">ngabsennn</h1>
          <p className="text-xs text-muted-foreground">Daily Intern Report & MagangHub Monev Generator</p>
        </div>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-medium">Masuk dengan Akun SIAPkerja</CardTitle>
            <CardDescription className="text-xs">
              Gunakan akun Kemnaker / MagangHub Anda untuk autentikasi otomatis presensi.
            </CardDescription>
          </CardHeader>
          <Form method="post">
            <CardContent className="space-y-3.5">
              {actionData?.error && (
                <Alert variant="destructive" className="py-2.5 px-3">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold">Gagal Masuk</AlertTitle>
                  <AlertDescription className="text-xs">
                    {actionData.error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">
                  Email Akun Kemnaker
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nama@email.com"
                    required
                    autoFocus
                    className="h-9 text-xs pl-8"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 opacity-60" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password SIAPkerja
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••••••"
                    required
                    className="h-9 font-mono text-xs pl-8"
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 opacity-60" />
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                size="default"
                className="w-full justify-center gap-2 text-xs font-medium cursor-pointer"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? "Menghubungkan ke Kemnaker SSO..." : "Masuk ke Dashboard"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardFooter>
          </Form>
        </Card>

        <div className="space-y-1 text-center text-[11px] text-muted-foreground">
          <p>
            Kredensial langsung diverifikasi ke server resmi <span className="font-semibold text-foreground/80">account.kemnaker.go.id</span> via OAuth SSO.
          </p>
          <p className="text-[10px] opacity-75">
            Password Anda tidak pernah disimpan di server atau database.
          </p>
        </div>
      </div>
    </div>
  );
}
