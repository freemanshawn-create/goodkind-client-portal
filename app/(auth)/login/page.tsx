"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { loginAction } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="from" value={from} />

      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="demo@client.com"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="password123"
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="dark" width={200} height={32} linked={false} />
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4 text-center">
            <h1 className="text-xl font-light text-foreground">
              Client Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </CardHeader>
          <CardContent>
            <Suspense>
              <LoginForm />
            </Suspense>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo credentials: demo@client.com / password123
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Goodkind Co. All rights reserved.
        </p>
      </div>
    </div>
  );
}
