import { Link, Outlet } from "react-router";
import { Wordmark } from "@/components/wordmark";

export function RootLayout() {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-240 items-center px-4">
          <Link to="/" aria-label="Argmax home">
            <Wordmark />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-240 px-4 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
