
"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  updateProfile,
  User,
} from "firebase/auth";
import { app } from "@/lib/firebase"; // Ensure firebase is initialized
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (user: User, isNewUser: boolean) => void;
}

const auth = getAuth(app);

export const AuthDialog = ({ open, onOpenChange, onAuthSuccess }: AuthDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (isSignUp: boolean) => {
    setLoading(true);
    try {
      if (isSignUp) {
        if (!name.trim()) {
            toast({
                title: "خطأ",
                description: "يرجى إدخال اسمك.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        toast({
          title: "تم إنشاء الحساب",
          description: "تم تسجيل دخولك بنجاح.",
        });
        onAuthSuccess(userCredential.user, true); // It's a new user
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "تم تسجيل الدخول",
          description: "أهلاً بعودتك!",
        });
        onAuthSuccess(userCredential.user, false); // It's an existing user
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      let message = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        message = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "هذا البريد الإلكتروني مستخدم بالفعل.";
      } else if (error.code === 'auth/weak-password') {
        message = "كلمة المرور ضعيفة جدًا. يجب أن تكون 6 أحرف على الأقل.";
      }
      toast({
        title: "خطأ في المصادقة",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>المصادقة</DialogTitle>
          <DialogDescription>
            سجل دخولك أو أنشئ حسابًا جديدًا لمزامنة بياناتك.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
            <TabsTrigger value="signup">حساب جديد</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email-login" className="text-right">
                  البريد
                </Label>
                <Input
                  id="email-login"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="name@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-login" className="text-right">
                  كلمة المرور
                </Label>
                <Input
                  id="password-login"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleAuth(false)} disabled={loading} className="w-full">
                {loading ? "جاري..." : "تسجيل الدخول"}
              </Button>
            </DialogFooter>
          </TabsContent>
          <TabsContent value="signup">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-signup" className="text-right">
                    الاسم
                </Label>
                <Input
                    id="name-signup"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3"
                    placeholder="اسمك الكامل"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email-signup" className="text-right">
                  البريد
                </Label>
                <Input
                  id="email-signup"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  placeholder="name@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-signup" className="text-right">
                  كلمة المرور
                </Label>
                <Input
                  id="password-signup"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                  placeholder="6 أحرف على الأقل"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleAuth(true)} disabled={loading} className="w-full">
                {loading ? "جاري..." : "إنشاء حساب جديد"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
