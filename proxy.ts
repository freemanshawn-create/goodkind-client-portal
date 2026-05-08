import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that should remain accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match everything except static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
