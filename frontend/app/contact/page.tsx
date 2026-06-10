"use client"

import { useState } from "react"
import { Navbar } from "@/components/ui/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "@/lib/i18n-context"

export default function ContactPage() {
  const { t } = useTranslation()
  const [toastVisible, setToastVisible] = useState(false)

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 2500) // hide toast after 2.5s
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Have questions about the awards or application process? We are here to help.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-2xl space-y-6">
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Visit Us</h3>
                    <p className="text-muted-foreground">
                      Nepal Academy of Science and Technology
                      <br />
                      Khumaltar, Lalitpur
                      <br />
                      Nepal
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <Phone className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Call Us</h3>
                    <p className="text-muted-foreground">
                      +977-1-5547715
                      <br />
                      +977-1-5547717
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <Mail className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Email Us</h3>
                    <p className="text-muted-foreground">
                      rgpawardnast@gmail.com 
                      <br />
                      promotion@nast.org.np
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-200 py-12 mt-auto relative">
        <div className="container mx-auto px-4 lg:px-8 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* NAST Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image src="/Nepal_Academy_of_Science_and_Technology_Logo.svg.png" width={34} height={34} alt="NAST" />
              <span className="font-bold text-xl">NAST</span>
            </div>
            <p className="text-sm text-slate-400">{t("hero.subtitle")}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3">{t("footer.quick_links")}</h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li><Link href="/prizes" className="hover:text-white">{t("nav.prizes")}</Link></li>
              <li><Link href="/about" className="hover:text-white">{t("nav.about")}</Link></li>
              <li><Link href="/contact" className="hover:text-white">{t("nav.contact")}</Link></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="font-semibold mb-3">{t("footer.contact")}</h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>
                <a
                  href="https://www.google.com/maps/place/Nepal+Academy+of+Science+and+Technology/@27.6561078,85.3251006,17z/data=!3m1!4b1!4m6!3m5!1s0x39eb17624b17beb9:0x16a8449f116b5fe!8m2!3d27.6561031!4d85.3276755!16s%2Fg%2F1tp_4tb8?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Khumaltar, Lalitpur
                </a>
              </li>
              <li
                className="cursor-pointer hover:underline"
                onClick={() => handleCopy("PO Box: 3323")}
              >
                PO Box: 3323
              </li>
              <li>
                <a href="tel:+977-1-5547715" className="hover:underline">
                  +977-1-5253715 / 5253717 / 5253720 / 5253721
                </a>
              </li>
              <li>
                <a href="mailto:info@nast.gov.np" className="hover:underline">
                  info@nast.gov.np
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">{t("footer.legal")}</h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>{t("footer.privacy")}</li>
              <li>{t("footer.terms")}</li>
            </ul>
          </div>
        </div>

        <div className="text-center text-sm text-slate-500 mt-10">
          © {new Date().getFullYear()} {t("footer.rights")}
        </div>

        {/* Toast Notification */}
        <div
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg transition-all duration-300 ${
            toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          PO Box copied to clipboard!
        </div>
      </footer>
    </div>
  )
}
