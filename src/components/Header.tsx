
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LayoutGrid, ClipboardList, Package, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { useUser, useFirebase } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from 'firebase/auth';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';


function AuthState() {
  const { user } = useUser();
  const { auth } = useFirebase();

  const handleSignOut = () => {
    if(auth) {
      signOut(auth);
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('google-access-token');
      }
    }
  }

  if (user) {
    return (
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Image
                src={user.photoURL || '/placeholder-user.png'}
                alt={user.displayName || 'User'}
                fill
                className="rounded-full object-cover"
                sizes="40px"
              />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return null;
}


export default function Header() {
  const pathname = usePathname();
  const { user } = useUser();

  const navLinks = [
    { href: '/', label: 'ขาย', icon: ShoppingCart },
    { href: '/summary', label: 'สรุป', icon: ClipboardList },
    { href: '/inventory', label: 'สต็อก', icon: Package },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
           <ShoppingCart className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold font-headline tracking-tight text-foreground">
            ร้านแฟร์
          </span>
        </Link>
        
        {user && (
          <nav className="hidden md:flex items-center gap-2 rounded-full bg-secondary p-1">
            {navLinks.map((link) => (
              <Button 
                key={link.href}
                variant="ghost" 
                asChild
                className={cn(
                  "rounded-full transition-colors",
                  pathname === link.href ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" /> 
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-4">
          <AuthState />
        </div>
      </div>
    </header>
  );
}
