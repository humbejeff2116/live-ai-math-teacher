import { AstridLogo } from "@/components/astrid/AstridLogo";
import { routes } from "@/routes";
import { appName } from "@shared/types";
import {
  ArrowRight,
  BotMessageSquare,
  CheckCircle2,
  Mic,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <AstridLogo />
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#how-it-works"
              className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:inline-flex"
            >
              How it works
            </a>
            <a
              href="#why"
              className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 sm:inline-flex"
            >
              Why it matters
            </a>
            <Link
              to={routes.demo}
              className="flex justify-center items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:inline-flex"
            >
              <span className="mr-2">Try the Demo</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                <BotMessageSquare size={14} />
                Live AI Math Tutor
              </div>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Learn math <span className="text-indigo-700">step by step</span>
                , live.
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                {appName} is a real-time AI math tutor that explains problems as
                you learn — not after. Powered by{" "}
                <span className="font-semibold text-slate-800">Astrid</span>, an
                interactive AI teacher you can pause, question, and rewind.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={routes.demo}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Try {appName} <ArrowRight size={16} />
                </Link>
                <Link
                  to="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Watch how it works
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <FeaturePill
                  icon={<Sparkles size={16} />}
                  title="Live explanations"
                />
                <FeaturePill
                  icon={<CheckCircle2 size={16} />}
                  title="Clickable steps"
                />
                <FeaturePill icon={<Mic size={16} />} title="Voice + text" />
              </div>
            </div>

            {/* Right-side “demo card” */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">
                  What you'll see
                </div>
                <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  30 sec demo
                </div>
              </div>

              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    1
                  </span>
                  Ask a question (text or voice)
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    2
                  </span>
                  Astrid explains the solution live
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    3
                  </span>
                  Steps appear and stay visible
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    4
                  </span>
                  Click any step - resume from there
                </li>
              </ol>

              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Demo GIF placeholder
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Drop your demo GIF here when ready.
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Tagline:{" "}
                <span className="font-semibold text-slate-700">
                  Understanding over answers.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              The problem
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Most AI math tools skip the learning.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              They give a final answer and a wall of explanation text. There's
              no natural way to interrupt, ask “why?” mid-step, or revisit the
              exact part you didn't understand. Learning becomes passive.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ProblemCard
                title="Final answer focus"
                body="Students see results, not reasoning."
              />
              <ProblemCard
                title="Static explanations"
                body="Hard to revisit the exact confusing step."
              />
              <ProblemCard
                title="No live interaction"
                body="You can’t pause, rewind, or interrupt like a tutor."
              />
            </div>
          </div>
        </section>

        {/* Solution */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-6xl px-4 py-10"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                The solution
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                A live AI teacher, not a calculator.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {appName} turns problem-solving into a conversation. Explanations
                stream live. Steps stay visible. And you can jump back to any
                step and continue learning from there.
              </p>

              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <Bullet
                  icon={<CheckCircle2 size={16} />}
                  text="Explanations happen in real time"
                />
                <Bullet
                  icon={<CheckCircle2 size={16} />}
                  text="Solutions broken into clear steps"
                />
                <Bullet
                  icon={<CheckCircle2 size={16} />}
                  text="Steps stay visible while you learn"
                />
                <Bullet
                  icon={<CheckCircle2 size={16} />}
                  text="Resume from any step without restarting"
                />
                <Bullet
                  icon={<CheckCircle2 size={16} />}
                  text="Text + voice input supported"
                />
              </ul>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Meet Astrid
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Your AI math teacher
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Astrid is designed to teach patiently and clearly. She
                re-explains when you’re stuck, responds to interruptions, and
                keeps audio, text, and steps in sync.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <AstridCard
                  title="Patient explanations"
                  body="Clear, step-by-step teaching."
                />
                <AstridCard
                  title="Interactive learning"
                  body="Ask follow-ups anytime."
                />
                <AstridCard
                  title="Resume from steps"
                  body="Jump back and continue."
                />
                <AstridCard
                  title="Synchronized audio"
                  body="Listen, pause, rewind."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Why it matters */}
        <section id="why" className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why {appName} matters
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Learning isn’t linear. Teaching shouldn’t be either.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              {appName} is built around how students actually learn: stopping,
              asking questions, revisiting confusing steps, and moving forward
              with confidence.
            </p>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-800">
                Current focus
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Tag>Linear equations</Tag>
                <Tag>Step-by-step reasoning</Tag>
                <Tag>Real-time interaction</Tag>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                More topics coming soon.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Stop memorizing answers. Start understanding them.
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Try {appName} and learn step by step with Astrid.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={routes.demo}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Try {appName} <ArrowRight size={16} />
                </Link>
                <Link
                  to="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>

          <footer className="mt-8 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {appName} · Powered by Astrid
          </footer>
        </section>
      </main>
    </div>
  );
}

function FeaturePill({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
      <span className="text-indigo-700">{icon}</span>
      <span className="font-semibold">{title}</span>
    </div>
  );
}

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 text-indigo-700">{icon}</span>
      <span>{text}</span>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function ProblemCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{body}</div>
    </div>
  );
}

function AstridCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white/60 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-700">{body}</div>
    </div>
  );
}
