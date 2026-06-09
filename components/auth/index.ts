// Authentication Components Export
export { default as EnhancedLoginForm } from './EnhancedLoginForm';
export { default as EnhancedRegisterForm } from './EnhancedRegisterForm';
export { default as ForgotPasswordForm } from './ForgotPasswordForm';
export { default as EmailVerificationForm } from './EmailVerificationForm';
export { default as AuthLayout, AuthFormCard, AuthLoadingOverlay } from './AuthLayout';

// Re-export types for convenience
export type { LoginProps, UserProps } from '@/types/types';

// Authentication configuration types
export interface AuthConfig {
  enableSocialLogin: boolean;
  enablePasswordStrength: boolean;
  enableEmailVerification: boolean;
  enableTwoFactor: boolean;
  passwordMinLength: number;
  sessionTimeout: number;
}

// Default authentication configuration
export const defaultAuthConfig: AuthConfig = {
  enableSocialLogin: true,
  enablePasswordStrength: true,
  enableEmailVerification: true,
  enableTwoFactor: false,
  passwordMinLength: 8,
  sessionTimeout: 3600000, // 1 hour in milliseconds
};

// Social login providers
export interface SocialProvider {
  id: string;
  name: string;
  icon: React.ComponentType;
  color: string;
  enabled: boolean;
}

// Validation rules for forms
export const validationRules = {
  email: {
    required: "Email is required",
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    }
  },
  password: {
    required: "Password is required",
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters"
    }
  },
  firstName: {
    required: "First name is required",
    minLength: {
      value: 2,
      message: "First name must be at least 2 characters"
    }
  },
  lastName: {
    required: "Last name is required",
    minLength: {
      value: 2,
      message: "Last name must be at least 2 characters"
    }
  },
  phone: {
    required: "Phone number is required",
    pattern: {
      value: /^[\+]?[1-9][\d]{0,15}$/,
      message: "Please enter a valid phone number"
    }
  },
  organizationName: {
    required: "Organization name is required",
    minLength: {
      value: 2,
      message: "Organization name must be at least 2 characters"
    }
  }
};

// Password strength checker utility
export const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const strength = (score / 5) * 100;

  return {
    score,
    strength,
    checks,
    level: strength < 40 ? 'weak' : strength < 70 ? 'medium' : 'strong'
  };
};