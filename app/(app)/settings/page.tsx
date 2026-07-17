"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  User,
  Bell,
  Key,
  Shield,
  Users,
  Upload,
  Download,
  Trash2,
  Copy,
  RefreshCw,
  Server,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { PageHero } from "@/components/app/page-hero"
import { RevealGroup } from "@/components/app/reveal-group"
import { useProfile } from "@/lib/hooks/useProfile"
import { updateCompanyName } from "@/app/actions/onboarding"

export default function SettingsPage() {
  const { profile: account } = useProfile()
  const [profile, setProfile] = useState({
    name: "Max Mustermann",
    email: "max@revetly.de",
    company: "",
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Seed company + logo from the loaded account profile.
  useEffect(() => {
    if (!account) return
    setProfile((p) => ({
      ...p,
      name: `${account.first_name ?? ""} ${account.last_name ?? ""}`.trim() || p.name,
      email: account.email || p.email,
      company: account.company_name ?? "",
    }))
    setLogoUrl(account.logo_url ?? null)
  }, [account])

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/company/logo", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) { setLogoUrl(data.logoUrl); toast.success("Logo aktualisiert") }
      else toast.error(data.error || "Upload fehlgeschlagen")
    } catch {
      toast.error("Upload fehlgeschlagen")
    } finally {
      setLogoUploading(false)
    }
  }

  const [notifications, setNotifications] = useState({
    newMatch: true,
    weeklyReport: true,
    productUpdates: false,
    marketingEmails: false,
  })

  const [apiKey] = useState("rcy_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    toast.success("API Key kopiert")
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const res = await updateCompanyName(profile.company)
    setSavingProfile(false)
    if (res.ok) {
      toast.success("Profil gespeichert", { description: "Deine Änderungen wurden übernommen." })
    } else {
      toast.error(res.error || "Speichern fehlgeschlagen")
    }
  }

  const handleExportData = () => {
    toast.info("Export gestartet", {
      description: "Du erhältst eine E-Mail, sobald der Export bereit ist.",
    })
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <RevealGroup className="relative z-[1] max-w-4xl space-y-8 p-6 lg:p-8">
        <PageHero
          eyebrow="Einstellungen"
          title="Konto & Präferenzen"
          subtitle="Verwalte dein Profil, Benachrichtigungen, Integrationen und Datenschutz."
        />

        {/* Profile Section */}
        <Card className="reveal border border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Profil</CardTitle>
            </div>
            <CardDescription>
              Deine persönlichen Informationen und Unternehmensdaten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Unternehmen</Label>
                <Input
                  id="company"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Firmenlogo</Label>
                <div className="flex items-center gap-2">
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-lg object-contain" />
                  )}
                  <Button variant="outline" size="sm" disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}>
                    {logoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {logoUrl ? "Ändern" : "Logo hochladen"}
                  </Button>
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Speichern
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="reveal border border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Benachrichtigungen</CardTitle>
            </div>
            <CardDescription>
              Lege fest, wann du E-Mail-Benachrichtigungen erhalten möchtest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-match">Neue Matches</Label>
                <p className="text-sm text-muted-foreground">
                  Benachrichtigung bei neuen Kandidaten-Matches
                </p>
              </div>
              <Switch
                id="notify-match"
                checked={notifications.newMatch}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, newMatch: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-report">Wöchentlicher Report</Label>
                <p className="text-sm text-muted-foreground">
                  Zusammenfassung deiner Recruiting-Aktivitäten
                </p>
              </div>
              <Switch
                id="notify-report"
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, weeklyReport: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-updates">Produkt-Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Neue Features und Verbesserungen
                </p>
              </div>
              <Switch
                id="notify-updates"
                checked={notifications.productUpdates}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, productUpdates: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-marketing">Marketing E-Mails</Label>
                <p className="text-sm text-muted-foreground">
                  Tipps und Best Practices für Recruiting
                </p>
              </div>
              <Switch
                id="notify-marketing"
                checked={notifications.marketingEmails}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, marketingEmails: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* API & Integrations Section */}
        <Card className="reveal border border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">API & Integrationen</CardTitle>
            </div>
            <CardDescription>
              Verbinde Revetly mit deinen bestehenden Tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={apiKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Verwende diesen Key, um die Revetly API zu nutzen.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>ATS Integrationen</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  SAP SuccessFactors (bald verfügbar)
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  Workday (bald verfügbar)
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  Personio (bald verfügbar)
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DSGVO / Data Privacy Section */}
        <Card className="reveal border border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Datenschutz (DSGVO)</CardTitle>
            </div>
            <CardDescription>
              Verwalte deine Daten gemäß der Datenschutz-Grundverordnung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Server className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Server-Standort: Deutschland
                </p>
                <p className="text-xs text-muted-foreground">
                  Alle Daten werden auf Servern in Deutschland gespeichert
                </p>
              </div>
              <Badge variant="outline">DSGVO-konform</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">Daten exportieren</p>
                <p className="text-sm text-muted-foreground">
                  Lade alle deine Daten als JSON-Datei herunter
                </p>
              </div>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                Exportieren
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-destructive">Konto löschen</p>
                <p className="text-sm text-muted-foreground">
                  Lösche dein Konto und alle zugehörigen Daten permanent
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Konto löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden. Alle
                      deine Daten, Jobs, Kandidaten und Matches werden permanent
                      gelöscht.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Ja, Konto löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Team Section (Placeholder) */}
        <Card className="reveal border border-border shadow-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Team</CardTitle>
              <Badge variant="secondary" className="ml-2">Bald verfügbar</Badge>
            </div>
            <CardDescription>
              Lade Teammitglieder ein und verwalte Berechtigungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                Team-Funktionen kommen in Version 2.0
              </p>
              <Button variant="outline" className="mt-4" disabled>
                Teammitglied einladen
              </Button>
            </div>
          </CardContent>
        </Card>
      </RevealGroup>
    </div>
  )
}
