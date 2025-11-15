import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    // Redirect authenticated users to dashboard
    if (context.session) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
});

function HomeComponent() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-12">
              <Link
                to="/"
                className="text-xl font-medium flex items-center gap-2"
              >
                <Bookmark className="h-6 w-6" />
                <span className="font-semibold">Bookmarks</span>
              </Link>
              <div className="hidden md:flex items-center gap-8 text-sm">
                <a
                  href="#features"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  How it works
                </a>
                <a
                  href="#testimonials"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Testimonials
                </a>
                <a
                  href="#platforms"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Platforms
                </a>
                <Link
                  to="/import"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Import
                </Link>
              </div>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 md:py-32">
        <div className="max-w-4xl">
          <div className="inline-block mb-6 text-xs tracking-wider uppercase text-muted-foreground">
            Social Bookmarks v1.0 →
          </div>
          <h1 className="text-5xl md:text-7xl font-normal text-muted-foreground leading-tight mb-8">
            Save, Search, and Organize your favorite posts from X and LinkedIn
            in one <span className="text-foreground">secure place</span>
          </h1>
          <div className="flex items-center gap-4 mb-6">
            <Button
              asChild
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              <Link to="/login">Get started free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background"
            >
              <a href="#features">Learn more</a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Free to use, no credit card required.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 max-w-4xl">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Users</div>
            <div className="text-3xl font-light">2,500+</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Bookmarks saved
            </div>
            <div className="text-3xl font-light">150K+</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              Collections
            </div>
            <div className="text-3xl font-light">12K</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Platforms</div>
            <div className="text-3xl font-light">2</div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="container mx-auto px-6 py-24" id="platforms">
        <div className="text-center space-y-6 mb-16">
          <h2 className="text-3xl font-normal">Supported platforms</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Save bookmarks from the most popular social and professional
            networking platforms
          </p>
        </div>

        <div className="flex flex-wrap gap-8 justify-center max-w-4xl mx-auto">
          <div className="bg-background border border-border p-8 w-64 flex flex-col items-center">
            <svg
              className="h-12 w-12 mb-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">X (Twitter)</h3>
            <p className="text-sm text-muted-foreground text-center">
              Save tweets, threads, and replies
            </p>
          </div>

          <div className="bg-background border border-border p-8 w-64 flex flex-col items-center">
            <svg
              className="h-12 w-12 mb-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">LinkedIn</h3>
            <p className="text-sm text-muted-foreground text-center">
              Save posts, articles, and updates
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted py-24" id="how-it-works">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-normal mb-16 text-center">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-foreground text-background font-bold text-xl mb-4">
                1
              </div>
              <h3 className="text-xl font-medium">Sign up</h3>
              <p className="text-sm text-muted-foreground">
                Create your free account using Google, X, LinkedIn, or email. No
                credit card required.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-foreground text-background font-bold text-xl mb-4">
                2
              </div>
              <h3 className="text-xl font-medium">Save bookmarks</h3>
              <p className="text-sm text-muted-foreground">
                Install our browser extension or use the import tool to bring in
                your existing bookmarks.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-foreground text-background font-bold text-xl mb-4">
                3
              </div>
              <h3 className="text-xl font-medium">Organize & search</h3>
              <p className="text-sm text-muted-foreground">
                Create collections, add categories, and use powerful search to
                find exactly what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What our users say */}
      <section className="bg-background py-24" id="testimonials">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-normal mb-16 text-center">
            What our users say
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-background p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-4">
                "Finally, a way to save all my favorite X threads without losing
                them in the endless scroll. The search feature is a game
                changer."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted" />
                <div>
                  <div className="text-sm font-medium">Sarah Chen</div>
                  <div className="text-xs text-muted-foreground">
                    Product Designer
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-background p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-4">
                "I use this daily to organize LinkedIn posts for my research.
                Collections make it so easy to categorize content by topic."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted" />
                <div>
                  <div className="text-sm font-medium">Marcus Johnson</div>
                  <div className="text-xs text-muted-foreground">
                    Content Strategist
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-background p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-4">
                "The browser extension is brilliant. One click and the post is
                saved with all the context. No more screenshots!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted" />
                <div>
                  <div className="text-sm font-medium">Alex Rivera</div>
                  <div className="text-xs text-muted-foreground">Developer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section className="container mx-auto px-6 py-24" id="features">
        <h2 className="text-3xl font-normal mb-16">Everything you need</h2>
        <div className="grid md:grid-cols-2 gap-16 max-w-6xl">
          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-medium mb-3">One-click saving</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Save posts from X and LinkedIn with a single click using our
                browser extension. Complete content including text, images, and
                videos.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-3">Powerful search</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Find any bookmark instantly with full-text search. Filter by
                platform, author, date, or category. Keyboard shortcuts for
                power users.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-medium mb-3">Smart organization</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Create collections and categories to organize your bookmarks.
                Share collections with your team for collaborative curation.
              </p>
            </div>
          </div>
          <div className="bg-muted aspect-square flex items-center justify-center">
            <Bookmark className="h-24 w-24 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-24" id="cta">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-normal mb-6">
            Never lose a great post again.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop losing important posts. Keep everything organized and
            accessible. Your personal knowledge base from social media.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            <Link to="/login">Get started</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
