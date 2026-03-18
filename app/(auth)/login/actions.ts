"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter your email and password" };
  }

  const result = await login(email, password);

  if (!result.success) {
    return { error: result.error };
  }

  const from = formData.get("from") as string;
  redirect(from || "/dashboard");
}
