import { Link } from "react-router-dom";

export const Logo = ({ className = "" }: { className?: string }) => (
  <Link to="/" className={`flex items-center gap-2 ${className}`}>
    <div className="relative h-8 w-8 mb-1">
        <img src="/logo_white.png" alt="Hamster logo" className="h-full w-full" />
    </div>
    <span className="font-display text-lg tracking-tight">Hamster</span>
  </Link>
);
