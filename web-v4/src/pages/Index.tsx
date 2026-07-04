import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Sparkles, Github, MessageSquare, FileText, Users, Zap,
  ShieldCheck, Cloud, ArrowRight, Wand2, CornerDownLeft
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const GITHUB_URL = "https://github.com/Anas-github-acc/hamster";

const features = [
  {
    icon: FileText,
    title: "Live collaborative docs",
    desc: "Multiple cursors, instant sync, version-safe built on Firestore realtime listeners.",
  },
  {
    icon: Sparkles,
    title: "AI co-writer",
    desc: "Summarize, rewrite or generate sections inline with /ai/summarize and /ai/generate.",
  },
  {
    icon: MessageSquare,
    title: "Channel chat",
    desc: "Threaded channels with typing indicators, presence, and file shares per channel.",
  },
  {
    icon: Users,
    title: "Presence & typing",
    desc: "See exactly who's reading, editing, or typing — powered by Realtime Database.",
  },
  {
    icon: Cloud,
    title: "Resumable uploads",
    desc: "Upload signed URLs, complete & share files directly from the editor sidebar.",
  },
  {
    icon: ShieldCheck,
    title: "Auth-first APIs",
    desc: "Every request signed with a Firebase ID token. Granular share endpoints baked in.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />

      {/* HERO */}
      <section className="relative pt-40 pb-32">
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1280}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="absolute inset-0 -z-10 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <Link to="/" className={`flex flex-col items-center align-middle justify-center`}>
            <div className="relative h-32 w-32">
                <img src="/logo_white.png" alt="Hamster logo" className="h-full w-full" />
            </div>
            {/* <span className="font-display text-md tracking-tight relative -top-2 left-1">Hamster</span> */}
          </Link>

          <h1 className="font-display mt-8 text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95] tracking-tight animate-fade-up">
            <span className="text-primary">Hamster</span> that thinks, 
            <br className="hidden sm:block" />
            chat, and ship your docs.
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base sm:text-lg text-muted-foreground animate-fade-up [animation-delay:120ms]">
            Hamster is a realtime collaboration workspace where your team writes,
            messages, and co-creates with an Gemini AI integration in one shared canvas.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up [animation-delay:240ms]">
            <Link to="/workspace">
              <Button variant="default" size="lg" className="gap-2">
                Open the workspace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Button variant="outline" size="lg" className="gap-2">
                <Github className="h-4 w-4" /> Star on GitHub
              </Button>
            </a>
          </div>

          {/* Floating product mock */}
          <div className="relative mx-auto mt-20 max-w-5xl animate-fade-up [animation-delay:360ms]">
            <div className="rounded-2xl bg-card border border-border p-2 shadow-lg">
              <div className="rounded-xl surface-2 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-secondary/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                  </div>
                  <div className="ml-3 text-xs font-mono text-muted-foreground">hamster.app/workspace/launch-plan</div>
                </div>
                <div className="grid grid-cols-12 min-h-[320px]">
                  <div className="col-span-3 border-r border-border p-4 text-left text-sm space-y-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Docs</div>
                    {["Launch plan", "API spec", "Onboarding", "Pricing"].map((d, i) => (
                      <div key={d} className={`px-2 py-1.5 rounded-md ${i===0 ? "bg-gradient-primary/10 text-foreground" : "text-muted-foreground"}`}>{d}</div>
                    ))}
                  </div>
                  <div className="col-span-6 p-6 text-left">
                    <div className="text-xs text-muted-foreground">README · edited just now</div>
                    <div className="mt-2 font-display text-2xl">Q3 launch plan<span className="animate-blink text-primary">|</span></div>
                    <div className="mt-4 h-2 w-3/4 rounded bg-muted" />
                    <div className="mt-2 h-2 w-2/3 rounded bg-muted" />
                    <div className="mt-2 h-2 w-1/2 rounded bg-muted" />
                    <div className="mt-6 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-gradient-accent text-accent-foreground">
                      <Wand2 className="h-3 w-3" /> AI suggested 3 edits
                    </div>
                  </div>
                  <div className="col-span-3 border-l border-border p-4 text-left text-sm">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">#general</div>
                    <div className="space-y-3">
                      <div><div className="text-xs text-primary">Mira</div><div className="text-foreground/90">looks great 🚀</div></div>
                      <div><div className="text-xs text-secondary">Kai</div><div className="text-foreground/90">pushing API spec now</div></div>
                      <div className="text-xs text-muted-foreground italic">Ada is typing…</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-sm text-primary font-mono">// features</div>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl tracking-tight">
              One canvas for <span className="text-primary">writing, talking, building.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every primitive — docs, channels, files, AI — wired to the same realtime
              workspace, so your team never has to context-switch again.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="rounded-2xl bg-card border border-border p-6 hover:bg-muted transition-colors group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display mt-5 text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section id="ai" className="relative py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="text-sm text-primary font-mono">// ai integration</div>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl tracking-tight">
              An <span className="text-gradient">AI co-author</span> at every cursor.
            </h2>
            <p className="mt-5 text-muted-foreground max-w-lg">
              Summarize long threads, draft new sections, or rewrite paragraphs with one
              shortcut. Backed by streaming endpoints — feels native, not bolted on.
            </p>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                ["POST /ai/summarize", "Compress any document or thread"],
                ["POST /ai/generate", "Draft sections from a single prompt"],
                ["Inline cmd-K", "Context-aware suggestions in the editor"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start gap-3">
                  <Zap className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <div className="font-mono text-xs text-foreground">{k}</div>
                    <div className="text-muted-foreground">{v}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card border border-border p-5 shadow-lg">
            <div className="rounded-xl bg-muted p-5 font-mono text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wand2 className="h-3.5 w-3.5 text-secondary" /> AI · /generate
              </div>
              <div className="mt-3 text-foreground/90">
                <span className="text-primary">{">"}</span> Draft a Q3 OKR for the platform team
              </div>
              <div className="mt-4 h-px bg-border" />
              <div className="mt-4 space-y-2 text-foreground/80">
                <p><span className="text-secondary">Objective.</span> Make hamster the fastest realtime workspace in its class.</p>
                <p><span className="text-secondary">KR1.</span> Reduce p95 sync latency to &lt; 80ms.</p>
                <p><span className="text-secondary">KR2.</span> Ship inline AI rewrites for 100% of docs.</p>
                <p className="text-muted-foreground italic">…streaming</p>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">⌘ + K to invoke anywhere</span>
                <span className="inline-flex items-center gap-1 text-primary">accept <CornerDownLeft className="h-3 w-3" /></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAT / REALTIME */}
      <section id="chat" className="relative py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div className="order-2 lg:order-1 rounded-2xl bg-card border border-border p-5 shadow-lg">
            <div className="rounded-xl bg-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="font-display"># launch-room</div>
                <div className="flex -space-x-2">
                  {["bg-primary", "bg-secondary", "bg-accent"].map((c, i) => (
                    <div key={i} className={`h-6 w-6 rounded-full ${c} border-2 border-background`} />
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex gap-2"><span className="text-primary">Mira</span><span className="text-foreground/90">shipping the API patch in 5</span></div>
                <div className="flex gap-2"><span className="text-secondary">Kai</span><span className="text-foreground/90">summary just dropped in /docs/launch-plan</span></div>
                <div className="flex gap-2"><span className="text-accent">Ada</span><span className="text-foreground/90">love it — adding a section on rollout</span></div>
                <div className="text-xs text-muted-foreground italic">Mira and Kai are typing…</div>
              </div>
              <div className="mt-4 flex items-center gap-2 bg-card rounded-lg px-3 py-2 text-sm">
                <input className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground" placeholder="Message #launch-room" />
                <kbd className="text-xs text-muted-foreground font-mono">↵</kbd>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="text-sm text-primary font-mono">// realtime chat</div>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl tracking-tight">
              Conversations that <span className="text-gradient">live next to your work.</span>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-lg">
              Channels, presence, typing, and shared files — all wired to the same docs
              you're editing. No tab-hopping. No lost context.
            </p>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-md">
            {[
              ["12ms", "Sync latency"],
              ["∞", "Channels per workspace"],
              ["100%", "Auth-protected"],
              ["1-click", "Share to any doc"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl bg-card border border-border p-4">
                <div className="font-display text-2xl text-primary">{n}</div>
                <div className="text-xs text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-card border border-border p-12 text-center relative overflow-hidden">
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">
              Start collaborating in <span className="text-primary">seconds.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Spin up a doc, invite the team, drop in AI. hamster is open-source and
              built for teams that ship fast.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/workspace">
                <Button variant="default" size="lg" className="gap-2">
                  Open workspace <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg" className="gap-2">
                  <Github className="h-4 w-4" /> View on GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} hamster. Built for realtime teams.</div>
          <div className="flex items-center gap-5">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
              <Github className="h-4 w-4" /> GitHub
            </a>
            <Link to="/workspace" className="hover:text-foreground transition-colors">Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
