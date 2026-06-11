"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, Check, X, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface FormErrors {
  full_name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

interface PasswordRules {
  length: boolean
  uppercase: boolean
  number: boolean
  special: boolean
}

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, isAdmin } = useAuth({ checkSession: false })

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [passwordStrength, setPasswordStrength] = useState(0)
  const [passwordRules, setPasswordRules] = useState<PasswordRules>({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  })

  const [formValues, setFormValues] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const firstErrorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    if (isAuthenticated) router.replace(isAdmin ? "/admin" : "/dashboard")
  }, [isAuthenticated, isAdmin, router])

  // Caps Lock detection
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockOn(true)
    } else {
      setCapsLockOn(false)
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState("CapsLock"))
  }

  // Email validation
  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address"
    }
    return undefined
  }

  // Name validation
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return "Full name is required"
    if (name.trim().length < 2) return "Name must be at least 2 characters"
    return undefined
  }

  // Password validation
  const checkPasswordStrength = (password: string) => {
    const rules: PasswordRules = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&#^(){}[\]\-_=+]/.test(password),
    }

    setPasswordRules(rules)

    let score = 0
    if (rules.length) score++
    if (rules.uppercase) score++
    if (rules.number) score++
    if (rules.special) score++

    setPasswordStrength(score)
  }

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required"
    if (passwordStrength < 3) {
      return "Password must meet at least 3 requirements"
    }
    return undefined
  }

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) return "Please confirm your password"
    if (confirmPassword !== password) return "Passwords do not match"
    return undefined
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormValues((prev) => ({ ...prev, [id]: value }))

    // Clear error when user starts typing
    if (errors[id as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [id]: undefined,
      }))
    }

    // Live validation
    if (id === "email") {
      const error = validateEmail(value)
      setErrors((prev) => ({
        ...prev,
        email: error,
      }))
    } else if (id === "full_name") {
      const error = validateName(value)
      setErrors((prev) => ({
        ...prev,
        full_name: error,
      }))
    } else if (id === "password") {
      checkPasswordStrength(value)
      const error = validatePassword(value)
      setErrors((prev) => ({
        ...prev,
        password: error,
      }))
      // Also re-validate confirm password if it exists
      if (formValues.confirmPassword) {
        const confirmError = validateConfirmPassword(formValues.confirmPassword, value)
        setErrors((prev) => ({
          ...prev,
          confirmPassword: confirmError,
        }))
      }
    } else if (id === "confirmPassword") {
      const error = validateConfirmPassword(value, formValues.password)
      setErrors((prev) => ({
        ...prev,
        confirmPassword: error,
      }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setTouched((prev) => ({ ...prev, [id]: true }))

    // Validate on blur
    if (id === "email") {
      const error = validateEmail(value)
      setErrors((prev) => ({
        ...prev,
        email: error,
      }))
    } else if (id === "full_name") {
      const error = validateName(value)
      setErrors((prev) => ({
        ...prev,
        full_name: error,
      }))
    } else if (id === "password") {
      const error = validatePassword(value)
      setErrors((prev) => ({
        ...prev,
        password: error,
      }))
    } else if (id === "confirmPassword") {
      const error = validateConfirmPassword(value, formValues.password)
      setErrors((prev) => ({
        ...prev,
        confirmPassword: error,
      }))
    }
  }

  // Check if form is valid
  const isFormValid = () => {
    return (
      !errors.full_name &&
      !errors.email &&
      !errors.password &&
      !errors.confirmPassword &&
      formValues.full_name.trim() !== "" &&
      formValues.email.trim() !== "" &&
      formValues.password !== "" &&
      formValues.confirmPassword !== "" &&
      passwordStrength >= 3 &&
      formValues.password === formValues.confirmPassword
    )
  }

  // Focus first error field
  const focusFirstError = () => {
    const errorFields = ["full_name", "email", "password", "confirmPassword"]
    for (const field of errorFields) {
      if (errors[field as keyof FormErrors]) {
        const element = document.getElementById(field)
        if (element) {
          element.focus()
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          break
        }
      }
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    // Validate all fields
    const nameError = validateName(formValues.full_name)
    const emailError = validateEmail(formValues.email)
    const passwordError = validatePassword(formValues.password)
    const confirmError = validateConfirmPassword(formValues.confirmPassword, formValues.password)

    setErrors({
      full_name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmError,
    })

    setTouched({
      full_name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (nameError || emailError || passwordError || confirmError) {
      focusFirstError()
      // Shake animation
      const card = document.querySelector('[data-register-card]')
      if (card) {
        card.classList.add("animate-shake")
        setTimeout(() => card.classList.remove("animate-shake"), 500)
      }
      return
    }

    setIsLoading(true)

    try {
      const res = await apiClient.post(
        "/api/auth/register",
        {
          full_name: formValues.full_name.trim(),
          email: formValues.email.trim().toLowerCase(),
          password: formValues.password,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      )

      // Success animation
      setShowSuccess(true)
      toast.success(res.data.msg || "Account created successfully!")

      // Redirect after delay
      setTimeout(() => {
        router.push("/login")
      }, 1500)
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again."

      if (error.code === "ECONNABORTED") {
        errorMessage = "Server took too long to respond. Please try again later."
      } else if (!error.response) {
        errorMessage = "Cannot connect to the server. Check your internet connection."
      } else if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data
        } else if (error.response.data.msg) {
          errorMessage = error.response.data.msg
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage)

      // Focus first error field if email/name conflict
      if (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("already")) {
        const emailField = document.getElementById("email")
        if (emailField) {
          emailField.focus()
          setErrors((prev) => ({
            ...prev,
            email: errorMessage,
          }))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return "Very Weak"
    if (passwordStrength === 1) return "Weak"
    if (passwordStrength === 2) return "Medium"
    if (passwordStrength === 3) return "Good"
    return "Strong"
  }

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return "bg-red-500"
    if (passwordStrength === 2) return "bg-yellow-500"
    if (passwordStrength === 3) return "bg-blue-500"
    return "bg-green-600"
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6">
      <Card
        data-register-card
        className={cn(
          "w-full max-w-lg shadow-xl border-0",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          mounted && "opacity-100 scale-100",
          showSuccess && "ring-2 ring-green-500"
        )}
        style={{
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        <CardHeader className="space-y-3 pb-4">
          {/* Logo */}
          <div className="flex justify-center mb-1">
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
              Create an Account
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Join the NAST research and innovation community.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={onSubmit} noValidate>
          <CardContent className="space-y-5">
            {/* Identity Section */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Ram Karki"
                  value={formValues.full_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-label="Full name"
                  aria-invalid={errors.full_name ? "true" : "false"}
                  aria-describedby={errors.full_name ? "full_name-error" : undefined}
                  className={cn(
                    "h-11 transition-all duration-150",
                    errors.full_name && touched.full_name && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  autoComplete="name"
                  required
                />
                {errors.full_name && touched.full_name && (
                  <p
                    id="full_name-error"
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rk@example.com"
                  value={formValues.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  aria-label="Email address"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={cn(
                    "h-11 transition-all duration-150",
                    errors.email && touched.email && "border-destructive focus-visible:ring-destructive/20"
                  )}
                  autoComplete="email"
                  required
                />
                {errors.email && touched.email && (
                  <p
                    id="email-error"
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-border/50" />

            {/* Security Section */}
            <div className="space-y-4">
              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formValues.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    aria-label="Password"
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={
                      errors.password || formValues.password
                        ? "password-error password-strength password-rules"
                        : undefined
                    }
                    className={cn(
                      "h-11 pr-10 transition-all duration-150",
                      errors.password && touched.password && "border-destructive focus-visible:ring-destructive/20",
                      passwordStrength >= 3 && formValues.password && !errors.password && "border-green-500"
                    )}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Caps Lock Warning */}
                {capsLockOn && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Caps Lock is on
                  </p>
                )}

                {/* Password Strength */}
                {formValues.password && (
                  <div className="space-y-2" id="password-strength" aria-live="polite">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 ease-out",
                          getStrengthColor()
                        )}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs font-medium" style={{ color: getStrengthColor().replace("bg-", "") }}>
                      {getStrengthLabel()}
                    </p>
                  </div>
                )}

                {/* Password Rules */}
                {formValues.password && (
                  <div
                    id="password-rules"
                    className="text-xs space-y-1.5 mt-2"
                    aria-live="polite"
                  >
                    <PasswordRule
                      text="At least 8 characters"
                      pass={passwordRules.length}
                    />
                    <PasswordRule
                      text="One uppercase letter (A-Z)"
                      pass={passwordRules.uppercase}
                    />
                    <PasswordRule text="One number (0-9)" pass={passwordRules.number} />
                    <PasswordRule
                      text="One special character (!@#$%)"
                      pass={passwordRules.special}
                    />
                  </div>
                )}

                {/* Security Note */}
                {formValues.password && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-2">
                    <Lock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>Your password is encrypted and never visible to staff.</span>
                  </p>
                )}

                {errors.password && touched.password && (
                  <p
                    id="password-error"
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={formValues.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    aria-label="Confirm password"
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    className={cn(
                      "h-11 pr-10 transition-all duration-150",
                      errors.confirmPassword && touched.confirmPassword && "border-destructive focus-visible:ring-destructive/20",
                      formValues.confirmPassword &&
                        formValues.password === formValues.confirmPassword &&
                        !errors.confirmPassword &&
                        "border-green-500"
                    )}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded p-1"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && touched.confirmPassword && (
                  <p
                    id="confirmPassword-error"
                    className="text-xs text-destructive flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                )}
                {formValues.confirmPassword &&
                  formValues.password === formValues.confirmPassword &&
                  !errors.confirmPassword && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Passwords match
                    </p>
                  )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isLoading || !isFormValid()}
              aria-label="Create your account"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Creating Account…</span>
                </>
              ) : showSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  <span>Account Created!</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded"
                aria-label="Go to login page"
              >
                Login
              </Link>
            </p>

            {/* Privacy Policy / Terms */}
            <div className="w-full pt-2 border-t border-border/50">
              <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <Link
                  href="/privacy"
                  className="hover:text-foreground hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded"
                >
                  Privacy Policy
                </Link>
                <span aria-hidden="true">•</span>
                <Link
                  href="/terms"
                  className="hover:text-foreground hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Password Rule Component
function PasswordRule({ text, pass }: { text: string; pass: boolean }) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 transition-colors duration-150",
        pass ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
      )}
    >
      {pass ? (
        <Check className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      ) : (
        <X className="h-3.5 w-3.5 flex-shrink-0 opacity-50" aria-hidden="true" />
      )}
      <span>{text}</span>
    </p>
  )
}
