import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Button } from '@rezics/dispatch-ui/shadcn/button'
import { Input } from '@rezics/dispatch-ui/shadcn/input'
import { Label } from '@rezics/dispatch-ui/shadcn/label'
import { KeyRound, Terminal, User } from 'lucide-react'

function useTicker() {
  const [tick, setTick] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setTick(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(tick.getUTCHours())}:${pad(tick.getUTCMinutes())}:${pad(tick.getUTCSeconds())} UTC`
}

export function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const ticker = useTicker()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = username.trim() && password

  return (
    <div className="relative flex min-h-screen items-stretch bg-background text-foreground">
      {/* Ambient grid + grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-dots opacity-50" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grain opacity-60 mix-blend-overlay" />

      {/* Left: brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border bg-card/50 p-10 lg:flex">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-[520px] rounded-full opacity-[0.18] blur-3xl"
          style={{ backgroundColor: 'var(--color-signal-amber)' }}
        />
        <div
          aria-hidden
          className="absolute bottom-[-200px] left-[-100px] size-[420px] rounded-full opacity-[0.12] blur-3xl"
          style={{ backgroundColor: 'var(--color-signal-cyan)' }}
        />

        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center border border-signal-amber/50"
              style={{ borderColor: 'color-mix(in oklab, var(--color-signal-amber) 50%, transparent)' }}>
              <Terminal className="size-4" style={{ color: 'var(--color-signal-amber)' }} />
            </div>
            <span className="font-mono text-[11px] tracking-wider-caps text-muted-foreground">
              DISPATCH · SIGNAL ROOM
            </span>
          </div>
          <div>
            <h1
              className="font-serif text-6xl font-medium leading-[0.95] tracking-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              <span>Control the</span>
              <br />
              <span style={{ color: 'var(--color-signal-amber)' }}>signal.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
              Operator console for the Dispatch task plane. Authenticate to observe live
              transactions, fleet telemetry, and queue depth in real time.
            </p>
          </div>
        </div>

        <div className="relative space-y-2 border-l border-signal-amber/40 pl-4 font-mono text-[11px] text-muted-foreground"
          style={{ borderColor: 'color-mix(in oklab, var(--color-signal-amber) 45%, transparent)' }}>
          <div className="flex items-center gap-2">
            <span
              className="size-1.5 rounded-full animate-signal-blink"
              style={{ backgroundColor: 'var(--color-signal-amber)' }}
            />
            <span className="tracking-wider-caps">UPLINK READY</span>
          </div>
          <div className="font-mono text-[11px] numeric-tabular">{ticker}</div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="relative flex w-full items-center justify-center p-6 lg:w-[480px]">
        <div className="relative w-full max-w-sm reveal">
          <div className="mb-8 lg:hidden">
            <div className="flex items-baseline gap-2">
              <span
                className="font-serif text-3xl font-semibold"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Dispatch
              </span>
              <span
                className="font-mono text-[10px] tracking-wider-caps"
                style={{ color: 'var(--color-signal-amber)' }}
              >
                // v1
              </span>
            </div>
          </div>

          <div className="relative border border-border bg-card p-8 corner-ticks">
            <div className="mb-7 space-y-2">
              <div className="font-mono text-[10.5px] tracking-wider-caps"
                style={{ color: 'var(--color-signal-amber)' }}>
                // ACCESS TERMINAL
              </div>
              <h2 className="text-xl font-medium text-foreground">Sign in</h2>
              <p className="text-sm text-muted-foreground">
                Enter your operator credentials to proceed.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="username"
                  className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
                >
                  <User className="size-3" />
                  Operator ID
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="root"
                  autoComplete="username"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-wider-caps text-muted-foreground"
                >
                  <KeyRound className="size-3" />
                  Passphrase
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="font-mono text-sm"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/5 px-3 py-2">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: 'var(--color-status-failed)' }}
                  />
                  <p className="font-mono text-[11px] text-destructive">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full gap-2 font-mono text-[11px] tracking-wider-caps"
                disabled={loading || !canSubmit}
              >
                {loading ? (
                  <>
                    <span
                      className="size-1.5 rounded-full animate-signal-blink"
                      style={{ backgroundColor: 'var(--color-primary-foreground)' }}
                    />
                    establishing link…
                  </>
                ) : (
                  <>engage uplink →</>
                )}
              </Button>
            </form>

            <div className="mt-6 border-t border-border/70 pt-4 font-mono text-[10px] tracking-wider-caps text-muted-foreground">
              dispatch.core · v1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
