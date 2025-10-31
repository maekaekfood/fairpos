
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser, useFirebase } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Loader2, LogIn, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to the main page
    if (!isUserLoading && user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async () => {
    if (!auth) return;
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken && typeof window !== 'undefined') {
        window.sessionStorage.setItem('google-access-token', credential.accessToken);
      }
      // On successful login, router will redirect via useEffect
    } catch (error) {
      console.error("Sign-in error:", error);
      setIsSigningIn(false);
    }
  };

  // While checking auth state or if user is found (and about to be redirected), show loading.
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">กำลังตรวจสอบสถานะ...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
       <div className="absolute top-8 flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <span className="text-3xl font-bold font-headline tracking-tight text-foreground">
            ร้านแฟร์
          </span>
        </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">ยินดีต้อนรับ</CardTitle>
          <CardDescription>กรุณาลงชื่อเข้าใช้เพื่อจัดการร้านค้าของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full"
            size="lg"
          >
            {isSigningIn ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            ลงชื่อเข้าใช้ด้วย Google
          </Button>
        </CardContent>
      </Card>
       <footer className="absolute bottom-4 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ร้านแฟร์. สงวนลิขสิทธิ์.</p>
      </footer>
    </div>
  );
}
