import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-8 flex justify-center">
          <Logo variant="dark" width={200} height={32} linked={false} />
        </div>

        <SignIn
          path="/login"
          routing="path"
          fallbackRedirectUrl="/dashboard"
        />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Goodkind Co. All rights reserved.
        </p>
      </div>
    </div>
  );
}
