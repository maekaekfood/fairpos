
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, ClipboardList, Package } from 'lucide-react';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';

export default function MobileNavBar() {
  const pathname = usePathname();
  const { user } = useUser();

  const navLinks = [
    { href: '/', label: 'ขาย', icon: ShoppingCart },
    { href: '/summary', label: 'สรุป', icon: ClipboardList },
    { href: '/inventory', label: 'สต็อก', icon: Package },
  ];

  if (!user) {
    return null;
  }

  // Do not show on login page
  if (pathname === '/login') {
    return null;
  }


  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-t-lg z-50">
      <nav className="grid h-full grid-cols-3">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <link.icon className="h-6 w-6" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
