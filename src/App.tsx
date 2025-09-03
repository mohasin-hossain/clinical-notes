import { Badge } from "@/components/ui/badge";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Activity, FileText, Stethoscope, Users } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                Clinical Notes
              </h1>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              <Activity className="mr-1 h-3 w-3" />
              Healthcare
            </Badge>
          </div>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to="/"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      isActive("/") && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Practitioners
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to="/patients"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      isActive("/patients") &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Patients
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link
                    to="/notes"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      isActive("/notes") && "bg-accent text-accent-foreground"
                    )}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Notes
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <Outlet />
      </main>
    </div>
  );
}
