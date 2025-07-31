// src/components/auth-dialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

interface AuthDialogProps {
  open: boolean;
  mode: "login" | "signup";
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: "login" | "signup") => void;
  onSuccess: () => void;
}

export const AuthDialog = ({
  open,
  mode,
  onOpenChange,
  onModeChange,
  onSuccess,
}: AuthDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !name.trim()) {
        toast({
            title: "خطأ",
            description: "يرجى إدخال الاسم.",
            variant: "destructive",
        });
        return;
    }
    setLoading(true);

    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        toast({
          title: "تم إنشاء الحساب",
          description: "تم تسجيل دخولك بنجاح.",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({
          title: "تم تسجيل الدخول",
          description: "أهلاً بعودتك!",
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error(error);
      let description = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      // Handle specific auth errors for better user feedback
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق منها والمحاولة مرة أخرى.";
      } else if (error.code === 'auth/email-already-in-use') {
        description = "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.";
      } else if (error.code === 'auth/weak-password') {
        description = "كلمة المرور ضعيفة جدًا. يجب أن تتكون من 6 أحرف على الأقل.";
      }
      toast({
        title: "حدث خطأ",
        description: description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد";
  const description =
    mode === "login"
      ? "أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك."
      : "قم بإنشاء حساب جديد لمزامنة بياناتك عبر الأجهزة.";
  const buttonText = mode === "login" ? "دخول" : "إنشاء";
  const switchModeText =
    mode === "login"
      ? "ليس لديك حساب؟ قم بإنشاء واحد"
      : "لديك حساب بالفعل؟ قم بتسجيل الدخول";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {mode === 'signup' && (
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  الاسم
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                البريد
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row-reverse sm:justify-start">
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "جاري..." : buttonText}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => onModeChange(mode === "login" ? "signup" : "login")}
            >
              {switchModeText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
