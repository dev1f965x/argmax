import { Link, Outlet } from "react-router";

export function RootLayout() {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link to="/" className="font-heading text-lg font-semibold">
            Argmax
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
