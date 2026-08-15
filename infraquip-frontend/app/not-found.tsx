import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section-container flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center text-center">
      <p className="text-7xl font-bold text-muted-foreground/30">404</p>
      <h1 className="mt-6 text-2xl font-semibold">Page Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        Go Home
      </Link>
    </div>
  );
}
