import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  LogOut,
  Menu,
  ScanLine,
  Settings2,
  Shield,
  Cpu,
  Tags,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const navItems = [
  { to: "/kiosk", label: "Kiosk", icon: ScanLine },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/cards", label: "Cards", icon: CreditCard },
  { to: "/activity-log", label: "Activity", icon: Activity },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/patient-types", label: "Types", icon: Tags },
  { to: "/settings", label: "Settings", icon: Settings2 },
];

const adminItems = [
  { to: "/branches", label: "Branches", icon: Building2 },
  { to: "/devices", label: "Devices", icon: Cpu },
];

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function NavBar() {
  const { admin, branches, selectedBranchId, setSelectedBranchId, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = admin?.branchId === null;
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = admin?.name
    ? admin.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-4 sm:px-4">
      <nav className="flex w-full max-w-5xl items-center gap-1 rounded-full border border-border bg-white/80 p-1.5 shadow-lg shadow-gray-900/5 backdrop-blur-md sm:gap-2">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-primary"
        >
          <span className="hidden sm:inline">PhysioCenter</span>
          <span className="sm:hidden">PC</span>
        </Link>

        {/* Desktop nav pills */}
        <div className="relative hidden flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none md:flex">
          {navItems.map((item) => {
            const active = isActive(location.pathname, item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}

          {isSuperAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`relative z-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive(location.pathname, "/branches") || isActive(location.pathname, "/devices")
                      ? "text-primary"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">Admin</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {adminItems.map((item) => (
                  <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {isSuperAdmin && (
            <Select
              value={selectedBranchId ? String(selectedBranchId) : "all"}
              onValueChange={(v) => setSelectedBranchId(v === "all" ? null : Number(v))}
            >
              <SelectTrigger className="hidden h-9 w-40 rounded-full border-border bg-white/70 text-xs sm:flex">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full transition-transform hover:scale-105 active:scale-95">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{admin?.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-6 pt-5">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="grid grid-cols-3 gap-2 px-1">
                {[...navItems, ...(isSuperAdmin ? adminItems : [])].map((item) => {
                  const active = isActive(location.pathname, item.to);
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium transition-colors ${
                          active ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground/70"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              {isSuperAdmin && (
                <div className="mt-4 px-1">
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">Branch</div>
                  <Select
                    value={selectedBranchId ? String(selectedBranchId) : "all"}
                    onValueChange={(v) => setSelectedBranchId(v === "all" ? null : Number(v))}
                  >
                    <SelectTrigger className="w-full rounded-full">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <SheetClose asChild>
                <button
                  onClick={logout}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
