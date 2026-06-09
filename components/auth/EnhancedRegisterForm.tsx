"use client";

import createUser from "@/actions/users/createUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import countries from "@/contries";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { generateSlug } from "@/lib/generateSlug";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/types/bilingual";
import { UserProps } from "@/types/types";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  Globe,
  Headset,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
  WarehouseIcon,
  X,
  Zap
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Logo from "../global/Logo";
import { useNotifications } from "../notifications/NotificationProvider";

// Enhanced types
export type OrgDataProps = {
  name: string;
  slug: string;
  country: string;
  currency: string | undefined;
  timezone: string | undefined;
};

// Password strength checker
const PasswordStrength = ({ password }: { password: string }) => {
  const [strength, setStrength] = useState(0);
  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    const newChecks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setChecks(newChecks);

    const score = Object.values(newChecks).filter(Boolean).length;
    setStrength((score / 5) * 100);
  }, [password]);

  const getStrengthColor = () => {
    if (strength < 40) return "bg-red-500";
    if (strength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strength < 40) return "Weak";
    if (strength < 70) return "Medium";
    return "Strong";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Password Strength</span>
        <span className={cn("text-sm font-semibold", {
          "text-red-600": strength < 40,
          "text-yellow-600": strength >= 40 && strength < 70,
          "text-green-600": strength >= 70
        })}>
          {getStrengthText()}
        </span>
      </div>
      <Progress value={strength} className="h-2">
        <div className={cn("h-full transition-all duration-300 rounded-full", getStrengthColor())}
             style={{ width: `${strength}%` }} />
      </Progress>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {Object.entries(checks).map(([key, passed]) => (
          <div key={key} className={cn("flex items-center gap-1", passed ? "text-green-600" : "text-gray-400")}>
            {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span className="capitalize">
              {key === "length" ? "8+ characters" :
               key === "special" ? "Special char" : key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Registration steps component
const RegistrationSteps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { number: 1, title: "Personal Info", icon: User },
    { number: 2, title: "Company Details", icon: Building2 },
    { number: 3, title: "Security Setup", icon: Shield },
  ];

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
            currentStep >= step.number
              ? "bg-violet-600 border-violet-600 text-white"
              : "border-gray-300 text-gray-400"
          )}>
            {currentStep > step.number ? (
              <Check className="h-5 w-5" />
            ) : (
              <step.icon className="h-5 w-5" />
            )}
          </div>
          <div className="ml-3 hidden sm:block">
            <p className={cn(
              "text-sm font-medium",
              currentStep >= step.number ? "text-violet-600" : "text-gray-400"
            )}>
              {step.title}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              "w-12 sm:w-16 h-0.5 mx-4 transition-all duration-300",
              currentStep > step.number ? "bg-violet-600" : "bg-gray-300"
            )} />
          )}
        </div>
      ))}
    </div>
  );
};

// Company size selector
const CompanySizeSelector = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const sizes = [
    { value: "1-10", label: "1-10 employees", icon: User },
    { value: "11-50", label: "11-50 employees", icon: Users },
    { value: "51-200", label: "51-200 employees", icon: Building2 },
    { value: "200+", label: "200+ employees", icon: WarehouseIcon },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {sizes.map((size) => (
        <button
          key={size.value}
          type="button"
          onClick={() => onChange(size.value)}
          className={cn(
            "p-4 rounded-lg border-2 transition-all duration-200 text-left",
            "hover:border-violet-300 hover:bg-violet-50",
            value === size.value
              ? "border-violet-600 bg-violet-50 text-violet-700"
              : "border-gray-200 bg-white"
          )}
        >
          <size.icon className={cn("h-5 w-5 mb-2", value === size.value ? "text-violet-600" : "text-gray-400")} />
          <div className="text-sm font-medium">{size.label}</div>
        </button>
      ))}
    </div>
  );
};

export default function EnhancedRegisterForm() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [companySize, setCompanySize] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [emailValid, setEmailValid] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    trigger,
  } = useForm<UserProps>();

  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  const localizedHref = (href: string) => localizePath(href, locale);
  const { formError, formSuccess, info } = useNotifications();

  // Watch form values
  const emailValue = watch("email");
  const passwordValue = watch("password");
  const firstNameValue = watch("firstName");
  const lastNameValue = watch("lastName");
  const organizationNameValue = watch("organizationName");

  useEffect(() => {
    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailValid(emailRegex.test(emailValue));
    }
  }, [emailValue]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof UserProps)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ["firstName", "lastName", "email"];
    } else if (currentStep === 2) {
      fieldsToValidate = ["organizationName", "phone"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: UserProps) => {
    try {
      setLoading(true);

      data.name = `${data.firstName} ${data.lastName}`;
      data.image = "https://utfs.io/f/59b606d1-9148-4f50-ae1c-e9d02322e834-2558r.png";

      const country = countries.find((country) => country.value === selectedCountry.value);
      const orgData: OrgDataProps = {
        name: data.organizationName,
        slug: generateSlug(data.organizationName),
        country: `${country?.label}-${country?.code}`,
        currency: country?.value,
        timezone: country?.timezone,
      };

      const res = await createUser(data, orgData);

      if (res.status === 409) {
        setLoading(false);
        formError("Registration Failed", res.error ?? "This email address is already registered", "This email address is already registered");
      } else if (res.status === 200) {
        setLoading(false);
        formSuccess("Account Created", "Registration successful! Please check your email for verification.");
        router.push(localizedHref(`/verify/${res?.data?.id}?email=${res?.data?.email}`));
      } else {
        setLoading(false);
        formError("Registration Failed", "Something went wrong during registration", "Please try again");
      }
    } catch (error) {
      setLoading(false);
      formError("Network Error", "Unable to create account. Please check your connection.", "Registration failed");
    }
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-700">
          <Logo />
          <div className="mt-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Create Your Account
            </h1>
            <p className="text-gray-600 mt-2">Join thousands of businesses using StockFlow</p>
          </div>
        </div>

        {/* Registration Steps */}
        <RegistrationSteps currentStep={currentStep} />

        {/* Registration Form */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-700">
          <CardHeader className="text-center pb-4">
            <CardTitle className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
                  {currentStep === 1 && "Personal Information"}
                  {currentStep === 2 && "Company Details"}
                  {currentStep === 3 && "Security Setup"}
                </CardTitle>
                <CardDescription>
                  {currentStep === 1 && "Tell us about yourself"}
                  {currentStep === 2 && "Setup your organization"}
                  {currentStep === 3 && "Secure your account"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <div className="relative">
                            <Input
                              id="firstName"
                              placeholder="John"
                              className="pl-10 h-12"
                              {...register("firstName", { required: "First name is required" })}
                            />
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                          {errors.firstName && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.firstName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <div className="relative">
                            <Input
                              id="lastName"
                              placeholder="Doe"
                              className="pl-10 h-12"
                              {...register("lastName", { required: "Last name is required" })}
                            />
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                          {errors.lastName && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          Email Address
                          {emailValid && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </Label>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@company.com"
                            className={cn(
                              "pl-10 h-12",
                              emailValid && "border-green-500 focus:border-green-500 focus:ring-green-500/20"
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

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 123-4567"
                            className="pl-10 h-12"
                            {...register("phone", { required: "Phone number is required" })}
                          />
                          <Headset className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        {errors.phone && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.phone.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Company Details */}
                  {currentStep === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-500">
                      <div className="space-y-2">
                        <Label htmlFor="organizationName">Company Name</Label>
                        <div className="relative">
                          <Input
                            id="organizationName"
                            placeholder="Acme Corporation"
                            className="pl-10 h-12"
                            {...register("organizationName", { required: "Company name is required" })}
                          />
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        {errors.organizationName && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.organizationName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Company Size</Label>
                        <CompanySizeSelector value={companySize} onChange={setCompanySize} />
                      </div>

                      <div className="space-y-2">
                        <Label>Country/Region</Label>
                        <Select
                          value={selectedCountry.code}
                          onValueChange={(value) => {
                            const country = countries.find(c => c.code === value);
                            if (country) setSelectedCountry(country);
                          }}
                        >
                          <SelectTrigger className="h-12">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <SelectValue placeholder="Select country" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                <div className="flex items-center gap-2">
                                  <span>{country.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {country.code}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-violet-800">
                            <p className="font-medium mb-1">Why do we need this information?</p>
                            <p>This helps us customize your experience and comply with local regulations.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Security Setup */}
                  {currentStep === 3 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-500">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            className="pl-10 pr-10 h-12"
                            {...register("password", {
                              required: "Password is required",
                              minLength: { value: 8, message: "Password must be at least 8 characters" }
                            })}
                          />
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {errors.password.message}
                          </p>
                        )}
                      </div>

                      {passwordValue && <PasswordStrength password={passwordValue} />}

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            id="terms"
                            className="mt-1 rounded border-gray-300"
                            required
                          />
                          <label htmlFor="terms" className="text-sm text-gray-600">
                            I agree to the{" "}
                            <Link href={localizedHref("/terms")} className="text-violet-600 hover:text-violet-500">
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href={localizedHref("/privacy")} className="text-violet-600 hover:text-violet-500">
                              Privacy Policy
                            </Link>
                          </label>
                        </div>

                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            id="marketing"
                            className="mt-1 rounded border-gray-300"
                          />
                          <label htmlFor="marketing" className="text-sm text-gray-600">
                            Send me product updates and marketing communications
                          </label>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-green-800">
                            <p className="font-medium mb-1">Your data is secure</p>
                            <p>We use enterprise-grade encryption to protect your information.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6">
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="h-12 px-6"
                      >
                        Back
                      </Button>
                    )}

                    <div className="ml-auto">
                      {currentStep < 3 ? (
                        <Button
                          type="button"
                          onClick={nextStep}
                          className="h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={loading}
                          className="h-12 px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Creating Account...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              Create Account
                            </div>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Sign In Link */}
                <div className="text-center mt-6 pt-6 border-t">
                  <p className="text-gray-600">
                    Already have an account?{" "}
                    <Link
                      href={localizedHref("/login")}
                      className="text-violet-600 hover:text-violet-500 font-semibold transition-colors"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
      </div>
    </TooltipProvider>
  );
}
