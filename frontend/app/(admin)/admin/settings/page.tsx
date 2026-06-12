"use client"

import { useEffect, useState } from "react"
import { Loader2, Mail, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface EmailSettingsResponse {
  enabled: boolean
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  smtp_user: string
  from_email: string
  from_name: string
  has_password: boolean
  updated_at: string | null
  updated_by: number | null
}

interface EmailSettingsForm {
  enabled: boolean
  smtp_host: string
  smtp_port: string
  smtp_secure: boolean
  smtp_user: string
  smtp_pass: string
  from_email: string
  from_name: string
}

const defaultForm: EmailSettingsForm = {
  enabled: false,
  smtp_host: "smtp.gmail.com",
  smtp_port: "587",
  smtp_secure: false,
  smtp_user: "",
  smtp_pass: "",
  from_email: "",
  from_name: "",
}

const getAdminToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem("adminToken") || localStorage.getItem("nast_token")
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "Never"

  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "Unknown"
  }
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<EmailSettingsForm>(defaultForm)
  const [settings, setSettings] = useState<EmailSettingsResponse | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const authHeaders = () => {
    const adminToken = getAdminToken()
    if (!adminToken) {
      toast.error("Authentication required")
      return null
    }

    return { Authorization: `Bearer ${adminToken}` }
  }

  const loadSettings = async () => {
    const headers = authHeaders()
    if (!headers) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await apiClient.get<EmailSettingsResponse>("/api/admin/email-settings", { headers })
      const data = response.data

      setSettings(data)
      setForm({
        enabled: Boolean(data.enabled),
        smtp_host: data.smtp_host || defaultForm.smtp_host,
        smtp_port: String(data.smtp_port || defaultForm.smtp_port),
        smtp_secure: Boolean(data.smtp_secure),
        smtp_user: data.smtp_user || "",
        smtp_pass: "",
        from_email: data.from_email || data.smtp_user || "",
        from_name: data.from_name || "",
      })
      setTestEmail(data.from_email || data.smtp_user || "")
    } catch (error: any) {
      console.error("Error loading email settings:", error)
      toast.error(error.response?.data?.msg || "Failed to load email settings")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    const headers = authHeaders()
    if (!headers) return

    setIsSaving(true)
    try {
      const response = await apiClient.put(
        "/api/admin/email-settings",
        {
          ...form,
          smtp_port: Number(form.smtp_port),
        },
        { headers }
      )

      toast.success(response.data?.msg || "Email settings saved successfully")
      const updatedSettings = response.data?.settings as EmailSettingsResponse
      if (updatedSettings) {
        setSettings(updatedSettings)
        setForm((current) => ({ ...current, smtp_pass: "" }))
      }
    } catch (error: any) {
      console.error("Error saving email settings:", error)
      toast.error(error.response?.data?.msg || "Failed to save email settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async () => {
    const headers = authHeaders()
    if (!headers) return

    setIsTesting(true)
    try {
      await apiClient.post(
        "/api/admin/email-settings/test",
        { to: testEmail.trim() || undefined },
        { headers }
      )
      toast.success("Test email sent successfully")
    } catch (error: any) {
      console.error("Error sending test email:", error)
      toast.error(error.response?.data?.msg || "Failed to send test email")
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">Manage application configuration and email delivery.</p>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Email password security</AlertTitle>
        <AlertDescription>
          SMTP passwords are encrypted on the server before they are saved. Leave the password field blank
          when editing settings to keep the currently saved password.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Service
            </CardTitle>
            <CardDescription>Store SMTP credentials for sending application and notification emails.</CardDescription>
          </div>
          <Badge variant={form.enabled ? "default" : "secondary"}>
            {form.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading email settings...
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled">Enable email service</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn this on after SMTP host, user, password, and sender details are configured.
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={form.enabled}
                  onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={form.smtp_host}
                    onChange={(event) => setForm((current) => ({ ...current, smtp_host: event.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    min="1"
                    max="65535"
                    value={form.smtp_port}
                    onChange={(event) => setForm((current) => ({ ...current, smtp_port: event.target.value }))}
                    placeholder="587"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="smtp_user">Username / Email</Label>
                  <Input
                    id="smtp_user"
                    type="email"
                    value={form.smtp_user}
                    onChange={(event) => setForm((current) => ({ ...current, smtp_user: event.target.value }))}
                    placeholder="name@example.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="smtp_pass">Password / SMTP Password</Label>
                  <Input
                    id="smtp_pass"
                    type="password"
                    value={form.smtp_pass}
                    onChange={(event) => setForm((current) => ({ ...current, smtp_pass: event.target.value }))}
                    placeholder={settings?.has_password ? "Password saved - leave blank to keep it" : "Enter SMTP password"}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="from_email">From Email</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={form.from_email}
                    onChange={(event) => setForm((current) => ({ ...current, from_email: event.target.value }))}
                    placeholder="name@example.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="from_name">From Name</Label>
                  <Input
                    id="from_name"
                    value={form.from_name}
                    onChange={(event) => setForm((current) => ({ ...current, from_name: event.target.value }))}
                    placeholder="NAST"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="smtp_secure">Use secure SMTP connection</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this for port 465. Leave it off for port 587 with STARTTLS.
                  </p>
                </div>
                <Switch
                  id="smtp_secure"
                  checked={form.smtp_secure}
                  onCheckedChange={(smtp_secure) => setForm((current) => ({ ...current, smtp_secure }))}
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                <p>Password status: {settings?.has_password ? "Saved securely" : "Not saved yet"}</p>
                <p>Last updated: {formatDate(settings?.updated_at || null)}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Email Settings
                </Button>
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="test_email">Send Test Email</Label>
                  <Input
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(event) => setTestEmail(event.target.value)}
                    placeholder="recipient@example.com"
                  />
                </div>
                <Button variant="outline" onClick={handleSendTest} disabled={isTesting}>
                  {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Test
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
