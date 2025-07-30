
// src/components/debt-flow/debt-flow-client.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Home, RefreshCw, X, LogIn, LogOut, UserPlus, Cloud, Lightbulb } from "lucide-react";
import { suggestPaymentPlan, SuggestPaymentPlanOutput } from "@/ai/flows/suggest-payment-plan";


import { AuthDialog } from "@/components/auth-dialog";
import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, deleteDoc } from "firebase/firestore";

interface DebtRecord {
  id: string;
  debtor_name: string;
  amount: number;
}

interface LocalName {
    id: string;
    name: string;
}

export const DebtManager = () => {
  const { toast } = useToast();
  const [debtorName, setDebtorName] = useState("");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DebtRecord[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogMode, setAuthDialogMode] = useState<'login' | 'signup'>('login');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [plan, setPlan] = useState<SuggestPaymentPlanOutput | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const formatNumber = (num: number): string => {
    const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
    return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  const [localNames, setLocalNames] = useState<LocalName[]>([]);
  const [newLocalName, setNewLocalName] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [filteredLocalNames, setFilteredLocalNames] = useState<LocalName[]>([]);

  // --- Data Fetching Logic ---
  const fetchDataFromLocalStorage = useCallback(() => {
    setLoading(true);
    try {
      const savedDebts = localStorage.getItem('debt-manager-records');
      const savedNames = localStorage.getItem('debt-manager-local-names');
      
      const debtData: DebtRecord[] = savedDebts ? JSON.parse(savedDebts) : [];
      const namesData: LocalName[] = savedNames ? JSON.parse(savedNames) : [];
      
      setDebtRecords(debtData.sort((a, b) => b.amount - a.amount));
      setLocalNames(namesData);

    } catch (error) {
      console.error('Error fetching data from localStorage:', error);
      toast({ title: "خطأ", description: "حدث خطأ في تحميل البيانات من المتصفح", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDataFromFirestore = useCallback(async (userId: string) => {
    setLoading(true);
    try {
        const debtsColRef = collection(db, "users", userId, "debts");
        const namesColRef = collection(db, "users", userId, "names");
        
        const debtSnapshot = await getDocs(debtsColRef);
        const nameSnapshot = await getDocs(namesColRef);

        const debtData = debtSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DebtRecord));
        const namesData = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocalName));

        setDebtRecords(debtData.sort((a, b) => b.amount - a.amount));
        setLocalNames(namesData);

    } catch (error) {
        console.error('Error fetching data from Firestore:', error);
        toast({ title: "خطأ", description: "فشل تحميل البيانات من السحابة.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  const mergeLocalAndFirestoreData = async (userId: string) => {
    setIsSyncing(true);
    toast({ title: "جاري المزامنة...", description: "دمج البيانات المحلية مع السحابة." });
    try {
        const localDebts: DebtRecord[] = JSON.parse(localStorage.getItem('debt-manager-records') || '[]');
        const localNames: LocalName[] = JSON.parse(localStorage.getItem('debt-manager-local-names') || '[]');

        if (localDebts.length === 0 && localNames.length === 0) {
            await fetchDataFromFirestore(userId);
            setIsSyncing(false);
            return;
        }

        const batch = writeBatch(db);
        const firestoreDebtsRef = collection(db, "users", userId, "debts");
        const firestoreDebtsSnapshot = await getDocs(firestoreDebtsRef);
        const firestoreDebts = firestoreDebtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DebtRecord));

        // Merge Debts
        localDebts.forEach(localDebt => {
            if (!localDebt.id) return; // Skip invalid records
            const firestoreDebt = firestoreDebts.find(d => d.id === localDebt.id);
            const docRef = doc(db, "users", userId, "debts", localDebt.id);
            
            if (firestoreDebt) {
                batch.update(docRef, { amount: localDebt.amount });
            } else {
                batch.set(docRef, { id: localDebt.id, debtor_name: localDebt.debtor_name, amount: localDebt.amount });
            }
        });

        // Merge Names
        const firestoreNamesRef = collection(db, "users", userId, "names");
        const firestoreNamesSnapshot = await getDocs(firestoreNamesRef);
        const firestoreNames = firestoreNamesSnapshot.docs.map(d => d.id);
        
        localNames.forEach(localName => {
            if (localName.id && !firestoreNames.includes(localName.id)) {
                const docRef = doc(db, "users", userId, "names", localName.id);
                batch.set(docRef, { id: localName.id, name: localName.name });
            }
        });

        await batch.commit();

        localStorage.removeItem('debt-manager-records');
        localStorage.removeItem('debt-manager-local-names');

        toast({ title: "اكتملت المزامنة", description: "تم حفظ بياناتك المحلية في السحابة." });
        await fetchDataFromFirestore(userId);

    } catch (error) {
        console.error("Error merging data:", error);
        toast({ title: "خطأ في المزامنة", description: "لم نتمكن من دمج بياناتك. سيتم تحميل البيانات السحابية.", variant: "destructive" });
        await fetchDataFromFirestore(userId);
    } finally {
        setIsSyncing(false);
    }
};


  // Auth state change listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAuthDialogOpen(false);
        await mergeLocalAndFirestoreData(currentUser.uid);
      } else {
        setDebtRecords([]);
        setLocalNames([]);
        fetchDataFromLocalStorage();
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDataFromLocalStorage, fetchDataFromFirestore]);

  // Filter debt records
  useEffect(() => {
    setFilteredRecords(
      searchTerm.trim() === ""
        ? debtRecords
        : debtRecords.filter(r => r.debtor_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, debtRecords]);

  // Filter local names
  useEffect(() => {
    setFilteredLocalNames(
      localSearchTerm.trim() === ""
        ? localNames
        : localNames.filter(n => n.name.toLowerCase().includes(localSearchTerm.toLowerCase()))
    );
  }, [localSearchTerm, localNames]);

  // Add new local name
  const addLocalName = async () => {
    const nameToAdd = newLocalName.trim();
    if (!nameToAdd) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم صحيح", variant: "destructive" });
      return;
    }
    if (localNames.some(n => n.name === nameToAdd)) {
      toast({ title: "خطأ", description: "هذا الاسم موجود بالفعل", variant: "destructive" });
      return;
    }
  
    const newNameEntry: LocalName = {
      id: `${Date.now()}-${nameToAdd.replace(/\s+/g, '-')}`,
      name: nameToAdd,
    };
  
    try {
      if (user) { // Firestore
        const docRef = doc(db, "users", user.uid, "names", newNameEntry.id);
        await setDoc(docRef, newNameEntry);
        // Re-fetch data from Firestore to ensure UI is in sync
        await fetchDataFromFirestore(user.uid);
      } else { // LocalStorage
        const updatedNames = [...localNames, newNameEntry];
        localStorage.setItem('debt-manager-local-names', JSON.stringify(updatedNames));
        // Manually update state for local storage
        setLocalNames(updatedNames);
      }
  
      setNewLocalName("");
      setLocalSearchTerm(""); 
      toast({ title: "تم الإضافة", description: `تم إضافة ${nameToAdd} للقائمة` });
    } catch (error) {
      console.error("Error adding name:", error);
      toast({ title: "خطأ", description: "فشلت إضافة الاسم.", variant: "destructive" });
      setNewLocalName(nameToAdd); // Restore input if save fails
    }
  };

  // Remove local name
  const removeLocalName = async (nameId: string) => {
    const nameToRemove = localNames.find(n => n.id === nameId)?.name || nameId;
    try {
        if (user) { // Firestore
            await deleteDoc(doc(db, "users", user.uid, "names", nameId));
        } else { // LocalStorage
            const updatedNames = localNames.filter(n => n.id !== nameId);
            localStorage.setItem('debt-manager-local-names', JSON.stringify(updatedNames));
        }
        setLocalNames(prev => prev.filter(n => n.id !== nameId));
        toast({ title: "تم الحذف", description: `تم حذف ${nameToRemove} من القائمة` });
    } catch(error) {
        console.error("Error removing name:", error);
        toast({ title: "خطأ", description: "فشلت عملية حذف الاسم.", variant: "destructive" });
    }
  };

  const recordOrPayDebt = async (isPayment: boolean) => {
    const name = debtorName.trim();
    if (!name || !amount.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المدين والمبلغ", variant: "destructive" });
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
        const existingRecord = debtRecords.find(r => r.debtor_name === name);

        if (isPayment && !existingRecord) {
            toast({ title: "خطأ", description: "لا يوجد دين مسجل لهذا الاسم", variant: "destructive" });
            setLoading(false);
            return;
        }

        const newAmount = existingRecord 
            ? (isPayment ? existingRecord.amount - amountNum : existingRecord.amount + amountNum)
            : amountNum;

        if (newAmount < 0) {
            toast({ title: "خطأ", description: "مبلغ السداد أكبر من الدين.", variant: "destructive" });
            setLoading(false);
            return;
        }
        
        const recordId = name; // Use name as the ID
        const newRecord: DebtRecord = { id: recordId, debtor_name: name, amount: newAmount };

        if (user) {
            const docRef = doc(db, "users", user.uid, "debts", recordId);
            if (newAmount <= 0) {
                await deleteDoc(docRef);
            } else {
                await setDoc(docRef, { debtor_name: name, amount: newAmount }, { merge: true });
            }
        } else {
            let updatedRecords = debtRecords.filter(r => r.id !== recordId);
            if (newAmount > 0) {
                updatedRecords.push(newRecord);
            }
            localStorage.setItem('debt-manager-records', JSON.stringify(updatedRecords));
        }

        let updatedRecordsState: DebtRecord[];
        if (newAmount <= 0) {
            updatedRecordsState = debtRecords.filter(r => r.id !== recordId);
            if (isPayment) toast({ title: "تم التسديد الكامل", description: `تم تسديد دين ${name} بالكامل` });
        } else {
            const existing = debtRecords.some(r => r.id === recordId);
            if (existing) {
                updatedRecordsState = debtRecords.map(r => r.id === recordId ? newRecord : r);
            } else {
                updatedRecordsState = [...debtRecords, newRecord];
            }
             
            if (isPayment) {
                 const message = `تم سداد ${formatNumber(amountNum)}. الدين المتبقي: ${formatNumber(newAmount)}`;
                 toast({ title: "تم السداد", description: message });
             } else {
                 const message = existingRecord ? `تم تحديث دين ${name}. المبلغ الجديد: ${formatNumber(newAmount)}` : `تم تسجيل دين لـ ${name} بمبلغ ${formatNumber(amountNum)} دينار`;
                 toast({ title: "تم تحديث الدين", description: message });
             }
        }
        setDebtRecords(updatedRecordsState.sort((a, b) => b.amount - a.amount));

        setDebtorName("");
        setAmount("");
    } catch(error) {
        console.error("Error updating debt:", error);
        toast({ title: "خطأ", description: "فشلت عملية تحديث الدين.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await auth.signOut();
    toast({ title: "تم تسجيل الخروج", description: "نأمل رؤيتك قريباً!" });
  };
  
  const selectedDebtorRecord = selectedDebtor 
    ? debtRecords.find(s => s.debtor_name === selectedDebtor)
    : null;
    
  const dataStatusIcon = user ? <Cloud className="h-5 w-5 text-blue-400" title="البيانات مخزنة سحابياً" /> : <Home className="h-5 w-5 text-green-400" title="البيانات مخزنة محلياً" />;


  const handleSuggestPlan = async () => {
    if (!selectedDebtorRecord) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد مدين أولاً لاقتراح خطة سداد.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingPlan(true);
    setIsPlanDialogOpen(true);
    
    try {
      const result = await suggestPaymentPlan({
        debtorName: selectedDebtorRecord.debtor_name,
        debtAmount: selectedDebtorRecord.amount,
      });
      setPlan(result);
    } catch (error) {
      console.error("Error suggesting payment plan:", error);
      toast({
        title: "خطأ في الذكاء الاصطناعي",
        description: "لم نتمكن من إنشاء خطة سداد في الوقت الحالي.",
        variant: "destructive",
      });
      setIsPlanDialogOpen(false); // Close dialog on error
    } finally {
      setIsGeneratingPlan(false);
    }
  };


  return (
    <div dir="rtl" className="p-4">
      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-card shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {dataStatusIcon}
                  نظام إدارة الديون
                </CardTitle>
                <div className="flex items-center gap-2">
                  {user ? (
                    <>
                      <span className="text-sm text-muted-foreground hidden sm:inline">{user.displayName || user.email}</span>
                      <Button variant="ghost" size="icon" onClick={handleLogout} disabled={isSyncing}>
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => { setAuthDialogMode('login'); setAuthDialogOpen(true); }}>
                        <LogIn className="h-5 w-5 ml-2" />
                        تسجيل الدخول
                      </Button>
                      <Button onClick={() => { setAuthDialogMode('signup'); setAuthDialogOpen(true); }}>
                        <UserPlus className="h-5 w-5 ml-2" />
                        إنشاء حساب
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDebtorRecord && (
                  <div className="p-3 bg-debt-card rounded-lg border-2 border-debt-accent text-center">
                    <p className="text-md">
                      إجمالي ديون {selectedDebtorRecord.debtor_name}: 
                      <span className="font-bold text-debt-accent"> {formatNumber(selectedDebtorRecord.amount)} دينار</span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="الاسم"
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      className="text-right"
                      disabled={isSyncing}
                    />
                    <Input
                      placeholder="المبلغ"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-right"
                      disabled={isSyncing}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => recordOrPayDebt(true)}
                    className="bg-success hover:bg-success/90 text-success-foreground font-semibold py-2"
                    disabled={loading || isSyncing}
                  >
                    تسديد الدين
                  </Button>
                  <Button
                    onClick={() => recordOrPayDebt(false)}
                    className="bg-debt-accent hover:bg-debt-accent/90 text-white font-semibold py-2"
                    disabled={loading || isSyncing}
                  >
                    تسجيل دين
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => user ? fetchDataFromFirestore(user.uid) : fetchDataFromLocalStorage()}
                      variant="outline"
                      className="w-full py-2 font-semibold"
                      disabled={loading || isSyncing}
                    >
                      <RefreshCw className={`h-5 w-5 ml-2 ${loading || isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'جاري المزامنة...' : 'تحديث القائمة'}
                    </Button>
                    <Button
                      onClick={handleSuggestPlan}
                      disabled={!selectedDebtorRecord || loading || isSyncing || isGeneratingPlan}
                      variant="outline"
                      className="w-full py-2 font-semibold border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Lightbulb className="h-5 w-5 ml-2" />
                      خطة سداد ذكية
                    </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-center">
                  الديون المسجلة ({filteredRecords.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="ابحث..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 text-right"
                  />
                </div>
                {loading && !isSyncing ? (
                    <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                    </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto p-2 border rounded-lg bg-background/50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => (
                          <Card
                            key={record.debtor_name}
                            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                              selectedDebtor === record.debtor_name 
                                ? 'bg-debt-accent text-white border-debt-accent' 
                                : 'bg-debt-card hover:bg-accent/50'
                            }`}
                            onClick={() => {
                              setSelectedDebtor(record.debtor_name);
                              setDebtorName(record.debtor_name);
                              setAmount("");
                            }}
                          >
                            <CardContent className="p-4 text-center">
                              <h3 className="font-semibold text-sm mb-1">{record.debtor_name}</h3>
                              <p className={`font-bold text-lg ${
                                selectedDebtor === record.debtor_name 
                                  ? 'text-white' 
                                  : 'text-debt-accent'
                              }`}>
                                {formatNumber(record.amount)} د
                              </p>
                            </CardContent>
                          </Card>
                        ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground col-span-full">
                        {searchTerm ? "لا توجد نتائج للبحث" : (user ? "لا توجد ديون سحابية" : "لا توجد ديون محلية")}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card shadow-lg sticky top-4">
              <CardHeader>
                <CardTitle className="text-xl text-center">
                  الأسماء المحفوظة ({filteredLocalNames.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="أدخل اسم جديد..."
                    value={newLocalName}
                    onChange={(e) => setNewLocalName(e.target.value)}
                    className="text-right"
                    onKeyPress={(e) => e.key === 'Enter' && addLocalName()}
                    disabled={isSyncing}
                  />
                  <Button
                    onClick={addLocalName}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isSyncing}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة للقائمة
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في الأسماء..."
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    className="text-right pr-10"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto p-2 border rounded-lg bg-background/50">
                  {filteredLocalNames.length > 0 ? (
                    filteredLocalNames.map((localName) => (
                      <Card
                        key={localName.id}
                        className="cursor-pointer transition-colors hover:bg-accent/50 bg-debt-card mb-2"
                        onClick={() => {
                          setDebtorName(localName.name);
                          setAmount("");
                          const record = debtRecords.find(r => r.debtor_name === localName.name);
                          setSelectedDebtor(record ? localName.name : null);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{localName.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLocalName(localName.id);
                              }}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {localSearchTerm ? "لا توجد نتائج" : "لا توجد أسماء بعد"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <AuthDialog
        open={authDialogOpen}
        mode={authDialogMode}
        onOpenChange={setAuthDialogOpen}
        onModeChange={setAuthDialogMode}
        onSuccess={() => {}}
      />
      
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>خطة السداد المقترحة لـ {selectedDebtorRecord?.debtor_name}</DialogTitle>
            <DialogDescription>
              هذه خطة مقترحة من الذكاء الاصطناعي لمساعدتك في إدارة الدين.
            </DialogDescription>
          </DialogHeader>
          {isGeneratingPlan ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="mr-4">جاري إنشاء الخطة الذكية...</p>
            </div>
          ) : plan ? (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold">المبلغ المقترح للدفعة</h4>
                <p className="text-2xl font-bold text-primary">{formatNumber(plan.suggestedPaymentAmount)} دينار</p>
              </div>
              <div>
                <h4 className="font-semibold">مدة السداد المقدرة</h4>
                <p className="text-lg">{plan.paymentDurationInMonths} أشهر</p>
              </div>
              <div>
                <h4 className="font-semibold">الأساس المنطقي</h4>
                <p className="text-sm text-muted-foreground">{plan.reasoning}</p>
              </div>
            </div>
          ) : (
             <div className="text-center p-8">
                <p>لم نتمكن من إنشاء خطة. يرجى المحاولة مرة أخرى.</p>
             </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsPlanDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
