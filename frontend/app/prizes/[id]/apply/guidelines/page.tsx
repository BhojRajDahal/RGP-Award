"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/ui/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Link, Upload, CheckCircle2, AlertCircle, Info, Download, ExternalLink } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const awardGuidelinesPdfUrl = "/Award%20guidelines.pdf"

export default function GuidelinesPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated, isAdmin, isChecking } = useAuth()
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    if (!isChecking) {
      // Redirect admins away from apply page
      if (isAdmin) {
        router.push("/prizes")
        return
      }
      // Redirect non-authenticated users to login
      if (!isAuthenticated) {
        router.push("/login")
        return
      }
    }
  }, [isChecking, isAuthenticated, isAdmin, router])

  // Show nothing while checking or redirecting
  if (isChecking || isAdmin || !isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 container py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push(`/prizes/${id}/apply`)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Application Form
            </Button>
            <h1 className="text-3xl font-bold mb-2">Application Guidelines</h1>
            <p className="text-muted-foreground">
              Please read these guidelines carefully before submitting your application.
            </p>
          </div>

          {/* Guidelines Content */}
          <div className="space-y-6">
            {/* Official Award Guidelines PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Official Award Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Review the official award guideline document before filling out the application form.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      File: Award guidelines.pdf
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline">
                      <a href={awardGuidelinesPdfUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open PDF
                      </a>
                    </Button>
                    <Button asChild>
                      <a href={awardGuidelinesPdfUrl} download="Award guidelines.pdf">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </a>
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* General Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  General Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 list-disc list-inside text-sm">
                  <li>All required fields must be completed accurately and truthfully.</li>
                  <li>Please ensure all information provided is correct before submission.</li>
                  <li>You can review your application before final submission.</li>
                  <li>Once submitted, you cannot edit your application.</li>
                  <li>Make sure to tick the declaration checkbox confirming the accuracy of your information.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Publication Link Submission Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Publication Link Submission Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 list-disc list-inside text-sm">
                  <li>Add all publication links in one document.</li>
                  <li>Convert the document into a single PDF file.</li>
                  <li>Ensure all publication links are correct and accessible.</li>
                  <li>Submit only one PDF containing all publication links.</li>
                  <li>Review the PDF carefully before final submission.</li>
                </ul>
              </CardContent>
            </Card>

            {/* File Upload Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  File Upload Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        File Size Limit: 200KB per file
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Each file you upload must be 200KB or less.</strong> This limit applies to every uploaded file individually.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Examples:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Allowed:</strong> 1 file of 180KB</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Allowed:</strong> Multiple files where every file is 200KB or less</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Not Allowed:</strong> 1 file of 250KB</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Not Allowed:</strong> Any single file larger than 200KB, even if other files are smaller</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <h4 className="font-semibold text-sm">Accepted File Types:</h4>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    <li><strong>Documents:</strong> PDF, DOC, DOCX</li>
                    <li><strong>Images:</strong> JPG, JPEG, PNG</li>
                  </ul>
                </div>

                <div className="space-y-3 mt-4">
                  <h4 className="font-semibold text-sm">File Upload Tips:</h4>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    <li>Compress images before uploading to keep each file under 200KB</li>
                    <li>Use PDF format for documents when possible</li>
                    <li>Check each file size before uploading</li>
                    <li>Reduce image resolution or PDF size if a file exceeds 200KB</li>
                    <li>Each individual file must be 200KB or less</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Application Process */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Application Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-3 list-decimal list-inside text-sm">
                  <li>
                    <strong>Step 1 - Common Information:</strong> Fill in all required common fields that apply to all prizes.
                  </li>
                  <li>
                    <strong>Step 2 - Prize Specific Information:</strong> Complete any prize-specific fields (if applicable).
                  </li>
                  <li>
                    <strong>Step 3 - Review:</strong> Review all your information and uploaded files before submission.
                  </li>
                  <li>
                    <strong>Declaration:</strong> Tick the declaration checkbox to confirm all information is accurate.
                  </li>
                  <li>
                    <strong>Submit:</strong> Click the submit button to finalize your application.
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertCircle className="h-5 w-5" />
                  Important Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                <p>
                  <strong>⚠️ File Size Validation:</strong> The system will automatically validate each uploaded file. 
                  If any file exceeds 200KB, you will not be able to submit the application.
                </p>
                <p>
                  <strong>⚠️ No Edits After Submission:</strong> Once you submit your application, you cannot make changes. 
                  Please review everything carefully before submitting.
                </p>
                <p>
                  <strong>⚠️ Required Fields:</strong> Fields marked with a red asterisk (*) are mandatory and must be completed.
                </p>
              </CardContent>
            </Card>

            {/* Back Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => router.push(`/prizes/${id}/apply`)}
                size="lg"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Application Form
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

