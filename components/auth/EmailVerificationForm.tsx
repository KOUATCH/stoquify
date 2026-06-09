"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/types/bilingual";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Timer
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Logo from "../global/Logo";
import { useNotifications } from "../notifications/NotificationProvider";

interface VerificationFormData {
  code: string;
}

export default function EmailVerificationForm() {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  const localizedHref = (href: string) => localizePath(href, locale);
  const email = searchParams.get("email") || "";
  const userId = searchParams.get("id") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<VerificationFormData>();

  const { formSuccess, formError, info } = useNotifications();
  const codeValue = watch("code");

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Auto-submit when code is complete
  useEffect(() => {
    if (codeValue && codeValue.length === 6) {
      handleSubmit(onSubmit)();
    }
  }, [codeValue]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: VerificationFormData) => {
    try {
      setLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate verification
      if (data.code === "123456") {
        setIsVerified(true);
        formSuccess(
          "Email Verified",
          "Your email has been successfully verified. Welcome to StockFlow!"
        );

        setTimeout(() => {
          router.push(localizedHref("/login"));
        }, 2000);
      } else {
        throw new Error("Invalid verification code");
      }

      setLoading(false);
    } catch (error) {
      setLoading(false);
      formError(
        "Verification Failed",
        "Invalid verification code. Please check your email and try again.",
        "Code may have expired or is incorrect"
      );
    }
  };

  const resendCode = async () => {
    try {
      setResendLoading(true);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setTimeLeft(300);
      setCanResend(false);
      setResendLoading(false);

      formSuccess(
        "Code Resent",
        "A new verification code has been sent to your email."
      );
    } catch (error) {
      setResendLoading(false);
      formError(
        "Resend Failed",
        "Unable to resend verification code. Please try again.",
        "Server error occurred"
      );
    }
  };

  // Format code input (add spaces every 3 digits)
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setValue("code", value);
  };

  if (isVerified) {
    return (
      <div className="space-y-8">
        {/* Logo */}
        <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-700">
          <Logo />
          <div className="mt-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-green-900 to-teal-900 bg-clip-text text-transparent">
              Email Verified!
            </h1>
            <p className="text-gray-600 mt-2">Welcome to StockFlow</p>
          </div>
        </div>

        {/* Success Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-700">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-800">Verification Complete</CardTitle>
            <CardDescription>
              Your email has been successfully verified
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Account Activated</p>
                  <p className="text-green-700">
                    Your StockFlow account is now active. You can start managing your inventory right away.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mr-3" />
              <span className="text-gray-600">Redirecting to login...</span>
            </div>

            <Link href={localizedHref("/login")}>
              <Button className="w-full h-12 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                Continue to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-700">
        <Logo />
        <div className="mt-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-emerald-900 to-teal-900 bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="text-gray-600 mt-2">Enter the verification code sent to your email</p>
        </div>
      </div>

      {/* Verification Form */}
      <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-700">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2">
            <Mail className="h-5 w-5 text-emerald-600" />
            Email Verification
          </CardTitle>
          <CardDescription>
            We sent a 6-digit code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Verification Code Input */}
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Verification Code
              </Label>
              <div className="relative">
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  className={cn(
                    "text-center text-lg font-mono tracking-widest h-14",
                    "focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                    errors.code && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  {...register("code", {
                    required: "Verification code is required",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "Please enter a valid 6-digit code"
                    }
                  })}
                  onChange={handleCodeChange}
                />
              </div>
              {errors.code && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Timer className="h-4 w-4" />
                <span>Code expires in {formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !codeValue || codeValue.length !== 6}
              className={cn(
                "w-full h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600",
                "hover:from-emerald-700 hover:via-teal-700 hover:to-green-700",
                "shadow-lg hover:shadow-xl transition-all duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Verify Email
                </div>
              )}
            </Button>
          </form>

          {/* Resend Code */}
          <div className="text-center">
            {canResend ? (
              <Button
                onClick={resendCode}
                disabled={resendLoading}
                variant="outline"
                className="h-10"
              >
                {resendLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Resend Code
                  </div>
                )}
              </Button>
            ) : (
              <p className="text-sm text-gray-500">
                Didn't receive the code?{" "}
                <span className="text-gray-400">
                  Resend available in {formatTime(timeLeft)}
                </span>
              </p>
            )}
          </div>

          {/* Help Section */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-teal-800">
                <p className="font-medium mb-1">Having trouble?</p>
                <ul className="space-y-1 text-teal-700">
                  <li>• Check your spam/junk folder</li>
                  <li>• Make sure the email address is correct</li>
                  <li>• Wait a few minutes for the email to arrive</li>
                  <li>• Try resending the code</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <p className="text-gray-600">
              Wrong email address?{" "}
              <Link
                href={localizedHref("/register")}
                className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors"
              >
                Go Back
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Shield className="h-4 w-4" />
          <span>Secure email verification</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <span>6-Digit Code</span>
          <span>•</span>
          <span>5-Minute Expiry</span>
          <span>•</span>
          <span>Single Use</span>
        </div>
      </div>
    </div>
  );
}
