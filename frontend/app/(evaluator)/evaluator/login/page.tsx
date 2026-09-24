"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import Image from "next/image"

export default function EvaluatorLoginPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  })
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: "", text: "" })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus({ type: "", text: "" })
    setIsSubmitting(true)

    try {
      const response = await apiClient.post("/api/evaluator/login", {
        email: formValues.email.trim(),
        password: formValues.password,
      })

      const responseData = response.data
      const msg = responseData.msg
      if (responseData?.token && responseData?.evaluator) {
        localStorage.setItem("evaluatorToken", responseData.token)
        localStorage.setItem("evaluatorData", JSON.stringify(responseData.evaluator))
      }

      // Set success status
      setStatus({
        type: "success",
        text: msg || "Login successful",
      })

      toast.success(msg || "Login successful")

      // Clear form
      setFormValues({ email: "", password: "" })

      // Redirect with delay
      setTimeout(() => {
        router.push("/evaluator/dashboard")
      }, 1200)
    } catch (error: any) {
      let errorMessage = "Login failed. Please check your credentials."
      
      if (error.response?.data) {
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

      setStatus({
        type: "error",
        text: errorMessage,
      })

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center">
              <a href="/">
                <Image 
                  src="/Nepal_Academy_of_Science_and_Technology_Logo.svg.png"
                  alt="NAST Logo"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </a>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Evaluator Login</CardTitle>
          <CardDescription className="text-center">
            Sign in to review applications
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="evaluator@example.com"
                required
                value={formValues.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formValues.password}
                onChange={handleChange}
              />
            </div>
            
            {/* Status Message */}
            {status.text && (
              <div
                className={`p-3 rounded-md text-sm ${
                  status.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : status.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {status.text}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col mt-1 gap-4">
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login as Evaluator"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Not an evaluator?{" "}
              <Link href="/login" className="text-primary hover:underline">
                User Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

