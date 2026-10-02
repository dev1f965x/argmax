import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
      {/* A link styled as a button; the Button component would add role="button". */}
      <Link to="/" className={buttonVariants()}>
        Back to lists
      </Link>
    </div>
  );
}
