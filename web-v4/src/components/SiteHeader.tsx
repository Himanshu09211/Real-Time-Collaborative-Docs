import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

const GITHUB_URL = "https://github.com/Anas-github-acc/hamster";

export const SiteHeader = () => {
  const { pathname } = useLocation();
  const isWorkspace = pathname.startsWith("/workspace");

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
        <div className="gradient-border rounded-full surface-1/80 backdrop-blur-xl flex items-center justify-between px-4 py-2.5">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="/#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="/#ai" className="hover:text-foreground transition-colors">AI</a>
            <a href="/#chat" className="hover:text-foreground transition-colors">Realtime</a>
            <Link to="/workspace" className="hover:text-foreground transition-colors">Workspace</Link>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-full hover:surface-2"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            {!isWorkspace && (
              <Link to="/workspace">
                <Button variant="hero" size="sm">Launch app</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
