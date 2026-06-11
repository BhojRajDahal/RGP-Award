"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/lib/i18n-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { AUTH_EVENT, useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import Image from "next/image"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, isAdmin } = useAuth({ checkSession: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: "", text: "" })
  const [mounted, setMounted] = useState(false)
  const loginInFlightRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    if (isAuthenticated) {
      router.replace(isAdmin ? "/admin" : "/dashboard")
    }
  }, [isAuthenticated, isAdmin, router])

  // Email validation
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return "Email is required"
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address"
    }
    return undefined
  }

  // Password validation
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Password is required"
    }
    if (password.length < 1) {
      return "Password cannot be empty"
    }
    return undefined
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }

    // Inline validation
    if (name === "email") {
      const error = validateEmail(value)
      setErrors((prev) => ({
        ...prev,
        email: error,
      }))
    } else if (name === "password") {
      const error = validatePassword(value)
      setErrors((prev) => ({
        ...prev,
        password: error,
      }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "email") {
      const error = validateEmail(value)
      setErrors((prev) => ({
        ...prev,
        email: error,
      }))
    } else if (name === "password") {
      const error = validatePassword(value)
      setErrors((prev) => ({
        ...prev,
        password: error,
      }))
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginInFlightRef.current) return

    setStatus({ type: "", text: "" })

    // Validate all fields
    const emailError = validateEmail(formValues.email)
    const passwordError = validatePassword(formValues.password)

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      })
      return
    }

    loginInFlightRef.current = true
    setIsSubmitting(true)

    try {
      // Single POST tries user → admin → evaluator server-side (avoids tripling rate limits).
      const response = await apiClient.post("/api/auth/login", {
        email: formValues.email,
        password: formValues.password,
      })

      const loginData = response.data
      const meResponse = await apiClient.get("/api/auth/me")
      const responseData = meResponse.data
      const user = responseData.user
      const role = responseData.role
      const msg = "Login successful"

      if (!user || !role) {
        setStatus({
          type: "error",
          text: "Invalid response from server",
        })
        toast.error("Invalid response from server")
        return
      }

      window.dispatchEvent(new Event(AUTH_EVENT))

      // Temporary compatibility for legacy pages still reading localStorage.
      if (typeof window !== "undefined" && loginData?.token && user) {
        localStorage.setItem("nast_token", loginData.token)
        localStorage.setItem("nast_user", JSON.stringify(user))
        if (role === "admin") {
          localStorage.setItem("adminToken", loginData.token)
          localStorage.setItem("adminData", JSON.stringify(user))
        }
        if (role === "evaluator") {
          localStorage.setItem("evaluatorToken", loginData.token)
          localStorage.setItem("evaluatorData", JSON.stringify(user))
        }
      }

      setStatus({
        type: "success",
        text: msg || "Login successful",
      })

      toast.success(msg || "Login successful")
      setFormValues({ email: "", password: "" })

      setTimeout(() => {
        if (role === "admin") {
          router.push("/admin")
        } else if (role === "evaluator") {
          router.push("/evaluator/dashboard")
        } else {
          router.push("/dashboard")
        }
      }, 1200)
    } catch (error: any) {
      let errorMessage = "Login failed. Please check your credentials."

      if (error.response?.status === 429) {
        errorMessage =
          error.response?.data?.msg ||
          "Too many attempts from this device. Wait about 15 minutes or restart the API server in development."
      } else if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data
        } else if (error.response.data.msg) {
          errorMessage = error.response.data.msg
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else {
          errorMessage = JSON.stringify(error.response.data)
        }
      } else if (error.message) {
        if (error.message.includes("Network") || error.message.includes("timeout")) {
          errorMessage = "Network error. Please check your connection and try again."
        } else {
          errorMessage = error.message
        }
      }

      // Only log detailed errors in development mode
      if (process.env.NODE_ENV === 'development') {
        if (error.response) {
          // For 401 errors, log minimal info
          if (error.response.status === 401) {
            console.warn(`[Login] Authentication failed`)
          } else if (error.response.status === 429) {
            console.warn("[Login] Rate limited — wait or restart API to reset in-memory limiter (dev)")
          } else {
            console.error(
              "Login failed:",
              `\nStatus: ${error.response.status} ${error.response.statusText}`,
              `\nMessage: ${errorMessage}`,
              `\nEndpoint: ${error.config?.url || "unknown"}`
            )
          }
        } else {
          console.error("Login failed:", errorMessage, "\nError:", error.message)
        }
      }

      setStatus({
        type: "error",
        text: errorMessage,
      })

      toast.error(errorMessage)
    } finally {
      loginInFlightRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6">
      <Card
        className={cn(
          "w-full max-w-md shadow-xl border-0",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          mounted && "opacity-100 scale-100"
        )}
        style={{
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <CardHeader className="space-y-4 pb-6">
          {/* Logo */}
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 p-2 shadow-md">
              <Link href="/" aria-label="Go to homepage">
                <Image
                  src="/Nepal_Academy_of_Science_and_Technology_Logo.svg.png"
                  alt="NAST Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {t("login.title")}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Welcome to Nepal Academy of Science and Technology (NAST)
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleLogin} noValidate>
          <CardContent className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                {t("login.email")}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={formValues.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-label="Email address"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={cn(
                    "h-11 transition-all duration-200",
                    errors.email && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p
                  id="email-error"
                  className="text-xs text-destructive flex items-center gap-1 mt-1"
                  role="alert"
                >
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  {t("login.password")}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded"
                  aria-label="Forgot password?"
                >
                  {t("login.forgot")}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                  value={formValues.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-label="Password"
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={cn(
                    "h-11 pr-10 transition-all duration-200",
                    errors.password && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-xs text-destructive flex items-center gap-1 mt-1"
                  role="alert"
                >
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Status Message */}
            {status.text && (
              <div
                className={cn(
                  "p-3 rounded-md text-sm flex items-start gap-2 transition-all duration-200",
                  status.type === "success"
                    ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                    : status.type === "error"
                    ? "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                    : "bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                )}
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{status.text}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !!errors.email || !!errors.password}
              aria-label="Sign in to your account"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>
                  {t("login.submit")}
                </span>
              )}
            </Button>

            {/* Sign Up Link */}
            <div className="text-center text-sm text-muted-foreground">
              {t("login.no_account")}{" "}
              <Link
                href="/register"
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded"
                aria-label="Create a new account"
              >
                {t("login.signup")}
              </Link>
            </div>

          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

