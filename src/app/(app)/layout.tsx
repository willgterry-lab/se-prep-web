import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

async function signOut() {
  "use server"
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0A192F]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold text-lg tracking-tight text-white">
            <span className="text-[#1ED760]">SE</span> Agent
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-sm text-white/50 hover:text-white transition-colors">
              {user.email}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
