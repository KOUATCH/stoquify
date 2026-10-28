"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/types/bilingual";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Key,
  Loader2,
  Mail,
  Send,
  Shield
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Logo from "../global/Logo";
import { useNotifications } from "../notifications/NotificationProvider";

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordForm() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  const localizedHref = (href: string) => localizePath(href, locale);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailValue, setEmailValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ForgotPasswordFormData>();

  const { formSuccess, formError, info } = useNotifications();
  const email = watch("email");

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      setEmailValue(data.email);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      setEmailSent(true);
      setLoading(false);
      formSuccess(
        "Reset Email Sent",
        "Password reset instructions have been sent to your email address."
      );
    } catch (error) {
      setLoading(false);
      formError(
        "Reset Failed",
        "Unable to send reset email. Please try again.",
        "Server error occurred"
      );
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-8">
        {/* Logo */}
        <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-700">
          <Logo />
          <div className="mt-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-green-900 to-teal-900 bg-clip-text text-transparent">
              Check Your Email
            </h1>
            <p className="text-gray-600 mt-2">Password reset instructions sent</p>
          </div>
        </div>

        {/* Success Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-700">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-800">Email Sent Successfully</CardTitle>
            <CardDescription>
              We have sent password reset instructions to <strong>{emailValue}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">What happens next?</p>
                  <ul className="space-y-1 text-green-700">
                    <li>• Check your inbox for a reset email</li>
                    <li>• Click the reset link in the email</li>
                    <li>• Create a new password</li>
                    <li>• Sign in with your new password</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-teal-800">
                  <p className="font-medium mb-1">Did not receive the email?</p>
                  <p className="text-teal-700">
                    Check your spam folder or{" "}
                    <button
                      onClick={() => {
                        setEmailSent(false);
                        setLoading(false);
                      }}
                      className="underline hover:no-underline font-medium"
                    >
                      try again
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => {
                  setEmailSent(false);
                  setLoading(false);
                }}
                variant="outline"
                className="w-full h-12"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Send to Different Email
              </Button>

              <Link href={localizedHref("/login")}>
                <Button className="w-full h-12 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Secure password reset process</span>
          </div>
          <p className="text-xs text-gray-400">
            Reset links expire in 24 hours for security
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-700">
        <Logo />
        <div className="mt-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-orange-900 to-red-900 bg-clip-text text-transparent">
            Reset Your Password
          </h1>
          <p className="text-gray-600 mt-2">Enter your email to receive reset instructions</p>
        </div>
      </div>

      {/* Reset Form */}
      <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-700">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2">
            <Key className="h-5 w-5 text-orange-600" />
            Password Recovery
          </CardTitle>
          <CardDescription>
            We will send you instructions to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  className={cn(
                    "pl-10 h-12 transition-all duration-200",
                    "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500",
                    errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address"
                    }
                  })}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-12 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600",
                "hover:from-orange-700 hover:via-red-700 hover:to-pink-700",
                "shadow-lg hover:shadow-xl transition-all duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending Reset Email...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Reset Instructions
                </div>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          {/* Back to Login */}
          <Link href={localizedHref("/login")}>
            <Button variant="outline" className="w-full h-12">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>

          {/* Help Text */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Need help?</p>
                <p className="text-orange-700">
                  If you are still having trouble, please{" "}
                  <Link href={localizedHref("/support")} className="underline hover:no-underline font-medium">
                    contact our support team
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Shield className="h-4 w-4" />
          <span>Secure password reset process</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>256-bit Encryption</span>
          <span>•</span>
          <span>24-hour Expiry</span>
          <span>•</span>
          <span>Single Use Links</span>
        </div>
      </div>
    </div>
  );
}
