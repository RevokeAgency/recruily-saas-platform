"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Login failed")
        setLoading(false)
        return
      }

      toast.success("Login successful!")
      onOpenChange(false)
      router.push("/dashboard")
    } catch (error) {
      toast.error("Something went wrong")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#0D9488]" />
            <span className="text-xl font-bold text-slate-900">Recruitify</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Welcome back
          </DialogTitle>
          <p className="text-slate-600 text-sm">
            Sign in to your account to continue
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="login-email" className="text-slate-700">Email</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 rounded-lg border-slate-200"
            />
          </div>

          <div>
            <Label htmlFor="login-password" className="text-slate-700">Password</Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 rounded-lg border-slate-200"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D9488] hover:bg-[#0B7C72] text-white rounded-lg"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-slate-600 mt-4">
          {"Don't have an account? "}
          <Link
            href="/auth/register"
            className="text-[#0D9488] font-medium hover:underline"
            onClick={() => onOpenChange(false)}
          >
            Sign up
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
