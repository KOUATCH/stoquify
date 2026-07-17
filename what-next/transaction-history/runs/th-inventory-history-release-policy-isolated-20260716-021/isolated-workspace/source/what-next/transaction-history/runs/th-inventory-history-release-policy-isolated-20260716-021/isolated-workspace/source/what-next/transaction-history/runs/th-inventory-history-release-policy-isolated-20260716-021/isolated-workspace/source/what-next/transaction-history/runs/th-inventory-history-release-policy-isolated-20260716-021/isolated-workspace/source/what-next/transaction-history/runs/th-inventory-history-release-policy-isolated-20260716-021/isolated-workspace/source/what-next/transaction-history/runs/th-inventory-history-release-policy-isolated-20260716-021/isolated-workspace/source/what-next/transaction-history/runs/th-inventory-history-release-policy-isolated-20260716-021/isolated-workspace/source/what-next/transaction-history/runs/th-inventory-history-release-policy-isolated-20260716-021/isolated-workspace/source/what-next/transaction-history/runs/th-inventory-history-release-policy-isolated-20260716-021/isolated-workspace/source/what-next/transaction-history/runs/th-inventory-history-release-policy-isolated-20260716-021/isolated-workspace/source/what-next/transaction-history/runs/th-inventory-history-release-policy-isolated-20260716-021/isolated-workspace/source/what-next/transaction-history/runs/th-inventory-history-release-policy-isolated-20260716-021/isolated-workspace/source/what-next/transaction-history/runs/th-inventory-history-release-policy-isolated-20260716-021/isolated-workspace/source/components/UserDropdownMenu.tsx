"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  ChevronDown,
  CreditCard,
  Crown,
  HelpCircle,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Palette,
  Settings,
  Shield,
  Sparkles,
  Star,
  Sun,
  User,
  UserCircle,
  Zap
} from "lucide-react";
import { getLocaleFromPathname, localizePath } from "@/i18n/routing";
import { signOut } from "@/lib/auth-client";
import { DEFAULT_LOCALE } from "@/types/bilingual";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

interface UserDropdownProps {
  username: string;
  email: string;
  avatarUrl?: string;
}

const UserDropdownMenu = ({
  username,
  email,
  avatarUrl,
}: UserDropdownProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  const localizedHref = (href: string) => localizePath(href, locale);
  const { resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isDarkTheme = resolvedTheme === "dark";

  const handleLogout = async () => {
    try {
      await signOut({
        redirectTo: "/login",
        redirect: true
      });
    } catch (error) {
      console.log(error);
      router.push(localizedHref("/login"));
    }
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(localizedHref(path));
  };

  // Get user role for display (fallback to default values since session is not available)
  const userRole = "User";
  const organizationName = "Stoquify";

  // Generate initials from username
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="dashboard-top-button group relative h-10 w-10 justify-center gap-3 rounded-xl px-0 transition-all duration-300 2xl:h-12 2xl:w-auto 2xl:justify-start 2xl:px-3"
        >
          {/* Enhanced Avatar with Status Indicator */}
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-white/15 transition-all duration-300 group-hover:scale-105 group-hover:ring-[#5796ff]/40 2xl:h-10 2xl:w-10">
              <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-[#2563eb] to-[#5796ff] text-sm font-bold text-white">
                {getInitials(username)}
              </AvatarFallback>
            </Avatar>
            {/* Online Status Indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#142129] bg-[#2ec98a] shadow-md animate-pulse" />
          </div>

          {/* User Info */}
          <div className="hidden min-w-0 flex-1 flex-col items-start 2xl:flex">
            <span className="max-w-32 truncate text-sm font-semibold text-white">
              {username}
            </span>
            <span className="max-w-32 truncate text-xs text-[#8fa4ab]">
              {email}
            </span>
          </div>

          {/* Dropdown Arrow */}
              <ChevronDown className="hidden h-4 w-4 text-[#8fa4ab] transition-all duration-300 group-hover:text-[#8fb7ff] group-data-[state=open]:rotate-180 2xl:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-[calc(100vw-1rem)] max-w-80 overflow-hidden rounded-xl border border-white/10 bg-[#0f171d]/95 p-0 text-[#d3ddd8] shadow-[0_24px_70px_rgba(5,12,16,0.42)] backdrop-blur-xl"
        align="end"
        forceMount
        sideOffset={8}
      >
        {/* Enhanced User Header */}
        <div className="relative border-b border-white/10 bg-[#142129] p-6">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(73,198,229,0.16),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(47,125,246,0.14),transparent_28%)]" />
          <div className="absolute right-2 top-2 h-20 w-20 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
          <div className="absolute bottom-2 left-2 h-16 w-16 rounded-full bg-gradient-to-tr from-white/5 to-transparent" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 shadow-xl ring-4 ring-white/10">
                <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-[#2563eb] to-[#5796ff] text-lg font-bold text-white">
                  {getInitials(username)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#142129] bg-[#2ec98a] shadow-lg animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="truncate text-lg font-bold text-white">{username}</h3>
              <p className="truncate text-sm text-[#9fb4bb]">{email}</p>

              <div className="flex items-center gap-2 mt-2">
                <Badge className="border border-white/10 bg-[rgba(45,212,191,0.14)] text-[#7de8dc] shadow-lg hover:bg-[rgba(45,212,191,0.18)]">
                  <Crown className="w-3 h-3 mr-1" />
                  {userRole}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.055] text-xs text-[#d3ddd8]">
                  {organizationName}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-b border-white/10 p-3">
          <DropdownMenuLabel className="px-0 pb-2 text-xs font-semibold uppercase tracking-wider text-[#7f969f]">
            Quick Actions
          </DropdownMenuLabel>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="dashboard-top-button h-auto flex-col gap-2 rounded-xl p-3 transition-all duration-200"
              onClick={() => handleNavigate("/dashboard/profile")}
            >
              <User className="h-4 w-4 text-[#8fb7ff]" />
              <span className="text-xs font-medium">Profile</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="dashboard-top-button h-auto flex-col gap-2 rounded-xl p-3 transition-all duration-200"
              onClick={() => handleNavigate("/dashboard/settings")}
            >
              <Settings className="h-4 w-4 text-[#8fb7ff]" />
              <span className="text-xs font-medium">Settings</span>
            </Button>
          </div>
        </div>

        {/* Account Management */}
        <DropdownMenuGroup className="p-2">
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-[#7f969f]">
            Account
          </DropdownMenuLabel>

          <DropdownMenuItem
            className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white"
            onClick={() => handleNavigate("/dashboard/profile")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(45,212,191,0.14)] p-2 transition-colors">
                <UserCircle className="h-4 w-4 text-[#7de8dc]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">My Profile</div>
                <div className="text-xs text-[#8fa4ab]">Update your information</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white"
            onClick={() => handleNavigate("/dashboard/settings/security")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(47,125,246,0.16)] p-2 transition-colors">
                <KeyRound className="h-4 w-4 text-[#8fb7ff]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Security</div>
                <div className="text-xs text-[#8fa4ab]">Password & 2FA settings</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white"
            onClick={() => handleNavigate("/dashboard/settings/notifications")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(73,198,229,0.14)] p-2 transition-colors">
                <Bell className="h-4 w-4 text-[#49c6e5]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Notifications</div>
                <div className="text-xs text-[#8fa4ab]">Email & push preferences</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-2 bg-white/10" />

        {/* Preferences */}
        <DropdownMenuGroup className="p-2">
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-[#7f969f]">
            Preferences
          </DropdownMenuLabel>

          <DropdownMenuItem className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white">
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-white/[0.07] p-2 transition-colors">
                {isDarkTheme ? <Moon className="h-4 w-4 text-[#8fb7ff]" /> : <Sun className="h-4 w-4 text-[#8fb7ff]" />}
              </div>
              <div className="flex-1">
                <div className="font-medium">Dark Mode</div>
                <div className="text-xs text-[#8fa4ab]">Toggle theme appearance</div>
              </div>
              <Switch
                checked={isDarkTheme}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                className="data-[state=checked]:bg-[#2dd4bf]"
              />
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white"
            onClick={() => handleNavigate("/dashboard/settings/appearance")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(47,125,246,0.16)] p-2 transition-colors">
                <Palette className="h-4 w-4 text-[#8fb7ff]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Appearance</div>
                <div className="text-xs text-[#8fa4ab]">Customize interface</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-2 bg-white/10" />

        {/* Support & Billing */}
        <DropdownMenuGroup className="p-2">
          <DropdownMenuItem
            className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white"
            onClick={() => handleNavigate("/dashboard/billing")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(47,125,246,0.16)] p-2 transition-colors">
                <CreditCard className="h-4 w-4 text-[#8fb7ff]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Billing & Plans</div>
                <div className="text-xs text-[#8fa4ab]">Manage subscription</div>
              </div>
              <Badge variant="outline" className="border-[#5796ff]/30 bg-[rgba(47,125,246,0.12)] text-xs text-[#8fb7ff]">
                Pro
              </Badge>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="group cursor-pointer rounded-lg p-3 transition-all duration-200 focus:bg-white/[0.08] focus:text-white"
            onClick={() => handleNavigate("/help")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(47,125,246,0.16)] p-2 transition-colors">
                <HelpCircle className="h-4 w-4 text-[#8fb7ff]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Help & Support</div>
                <div className="text-xs text-[#8fa4ab]">Get assistance</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-2 bg-white/10" />

        {/* Logout */}
        <div className="p-2">
          <DropdownMenuItem
            className="group cursor-pointer rounded-lg border border-transparent p-3 transition-all duration-200 focus:border-[#ef6a6a]/40 focus:bg-[#ef6a6a]/12 focus:text-white"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="rounded-lg bg-[rgba(239,106,106,0.14)] p-2 transition-colors">
                <LogOut className="h-4 w-4 text-[#efb0b0]" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Sign Out</div>
                <div className="text-xs text-[#8fa4ab]">End your session</div>
              </div>
            </div>
          </DropdownMenuItem>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 bg-white/[0.035] p-3">
          <div className="text-center text-xs text-[#8fa4ab]">
            Stoquify v2.1.0
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdownMenu;
