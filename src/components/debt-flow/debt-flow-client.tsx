
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, app } from "@/lib/firebase";
import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    deleteDoc,
    writeBatch,
    query
} from "firebase/firestore";
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
import { Search, Plus, User as UserIcon, LogOut, LogIn, RefreshCw, X, FileText, Printer } from "lucide-react";
import { generateInvoice, GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import { AuthDialog } from "@/components/auth-dialog";
import { ThemeToggle } from "../theme-toggle";


interface DebtRecord {
  id: string; // Will be debtor_name for simplicity
  debtor_name: string;
  amount: number;
}

interface LocalName {
    id: string; // Can be a timestamp or a generated ID
    name: string;
}

const auth = getAuth(app);

export const DebtManager = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  const [debtorName, setDebtorName] = useState("");
  const [amount, setAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DebtRecord[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [invoice, setInvoice] = useState<GenerateInvoiceOutput | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [lastPayment, setLastPayment] = useState<number | null>(null);

  const [localNames, setLocalNames] = useState<LocalName[]>([]);
  const [newLocalName, setNewLocalName] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [filteredLocalNames, setFilteredLocalNames] = useState<LocalName[]>([]);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  // --- Utility Functions ---
  const formatNumber = (num: number): string => {
    const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
    return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Auth State & Data Fetching Logic ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        fetchDataFromLocalStorage();
      }
      // We set loading to false here to quickly show the UI,
      // the real loading state for data will be handled inside listeners.
      setLoading(false); 
    });
    return () => unsubscribe();
  }, []);
  
  // --- Firestore Real-time Listeners ---
  useEffect(() => {
    if (user) {
        setLoading(true);
        const namesQuery = query(collection(db, "users", user.uid, "localNames"));
        const debtsQuery = query(collection(db, "users", user.uid, "debtRecords"));

        const unsubscribeNames = onSnapshot(namesQuery, (querySnapshot) => {
            const namesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LocalName));
            setLocalNames(namesData);
        }, (error) => {
            console.error("Error fetching local names from Firestore:", error);
            toast({ title: "خطأ في الشبكة", description: "فشل تحميل قائمة الأسماء.", variant: "destructive" });
        });

        const unsubscribeDebts = onSnapshot(debtsQuery, (querySnapshot) => {
            const debtData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DebtRecord));
            setDebtRecords(debtData.sort((a, b) => b.amount - a.amount));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching debt records from Firestore:", error);
            toast({ title: "خطأ في الشبكة", description: "فشل تحميل سجلات الديون.", variant: "destructive" });
            setLoading(false);
        });
      
      return () => {
        unsubscribeNames();
        unsubscribeDebts();
      };
    } else {
        // Clear data when user logs out
        setDebtRecords([]);
        setLocalNames([]);
        fetchDataFromLocalStorage();
    }
  }, [user, toast]);
  

  const fetchDataFromLocalStorage = () => {
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
  };

  const syncLocalDataToFirestore = async (userId: string) => {
    setIsSyncing(true);
    toast({ title: "جاري المزامنة", description: "يتم نقل بياناتك المحلية إلى حسابك السحابي..." });
  
    try {
      const batch = writeBatch(db);
  
      const localNamesToSync = localStorage.getItem('debt-manager-local-names');
      if (localNamesToSync) {
        const names: LocalName[] = JSON.parse(localNamesToSync);
        names.forEach(name => {
          const docRef = doc(db, "users", userId, "localNames", name.id);
          batch.set(docRef, { name: name.name });
        });
      }
  
      const localDebtsToSync = localStorage.getItem('debt-manager-records');
      if (localDebtsToSync) {
        const debts: DebtRecord[] = JSON.parse(localDebtsToSync);
        debts.forEach(debt => {
          const docRef = doc(db, "users", userId, "debtRecords", debt.id);
          batch.set(docRef, { debtor_name: debt.debtor_name, amount: debt.amount });
        });
      }
  
      await batch.commit();
  
      localStorage.removeItem('debt-manager-local-names');
      localStorage.removeItem('debt-manager-records');
      
      toast({ title: "اكتملت المزامنة", description: "تم حفظ بياناتك المحلية في حسابك." });
  
    } catch (error) {
      console.error("Error syncing data to Firestore:", error);
      toast({ title: "فشل المزامنة", description: "لم نتمكن من مزامنة بياناتك المحلية.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleAuthSuccess = async (newUser: User, isNewUser: boolean) => {
    setUser(newUser);
    if (isNewUser) {
        const localDebts = localStorage.getItem('debt-manager-records');
        const localNames = localStorage.getItem('debt-manager-local-names');
        if ((localDebts && JSON.parse(localDebts).length > 0) || (localNames && JSON.parse(localNames).length > 0)) {
            await syncLocalDataToFirestore(newUser.uid);
        }
    }
  };

  const handleLogout = async () => {
    setSelectedDebtor(null);
    setDebtorName("");
    setAmount("");
    await signOut(auth);
    fetchDataFromLocalStorage();
    toast({ title: "تم تسجيل الخروج بنجاح" });
  };
  
  // --- Filtering ---
  useEffect(() => {
    setFilteredRecords(
      searchTerm.trim() === "" ? debtRecords : debtRecords.filter(r => r.debtor_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, debtRecords]);

  useEffect(() => {
    setFilteredLocalNames(
      localSearchTerm.trim() === "" ? localNames : localNames.filter(n => n.name.toLowerCase().includes(localSearchTerm.toLowerCase()))
    );
  }, [localSearchTerm, localNames]);
  

  // --- Core Actions ---
  const addLocalName = async () => {
    const nameToAdd = newLocalName.trim();
    if (!nameToAdd) return toast({ title: "خطأ", description: "يرجى إدخال اسم صحيح", variant: "destructive" });
    if (localNames.some(n => n.name === nameToAdd)) return toast({ title: "خطأ", description: "هذا الاسم موجود بالفعل", variant: "destructive" });
  
    const newNameEntry: LocalName = { id: `${Date.now()}`, name: nameToAdd };
    
    if (user) {
        try {
            await setDoc(doc(db, "users", user.uid, "localNames", newNameEntry.id), { name: nameToAdd });
            toast({ title: "تم الإضافة", description: `تم إضافة ${nameToAdd} إلى القائمة السحابية.` });
        } catch (e) {
            console.error("Error adding document: ", e);
            return toast({ title: "خطأ", description: "فشل إضافة الاسم.", variant: "destructive" });
        }
    } else {
        const updatedNames = [...localNames, newNameEntry];
        localStorage.setItem('debt-manager-local-names', JSON.stringify(updatedNames));
        setLocalNames(updatedNames);
        toast({ title: "تم الإضافة", description: `تم إضافة ${nameToAdd} للقائمة المحلية.` });
    }
  
    setNewLocalName("");
    setLocalSearchTerm("");
  };

  const removeLocalName = async (nameId: string) => {
    const nameToRemove = localNames.find(n => n.id === nameId)?.name || "الاسم المحدد";
    if (user) {
        try {
            await deleteDoc(doc(db, "users", user.uid, "localNames", nameId));
            toast({ title: "تم الحذف", description: `تم حذف ${nameToRemove} من القائمة السحابية.` });
        } catch(e) {
            console.error("Error deleting document: ", e);
            return toast({ title: "خطأ", description: "فشل حذف الاسم.", variant: "destructive" });
        }
    } else {
        const updatedNames = localNames.filter(n => n.id !== nameId);
        localStorage.setItem('debt-manager-local-names', JSON.stringify(updatedNames));
        setLocalNames(updatedNames);
        toast({ title: "تم الحذف", description: `تم حذف ${nameToRemove} من القائمة المحلية.` });
    }
  };

  const recordOrPayDebt = async (isPayment: boolean) => {
    const name = debtorName.trim();
    const amountNum = parseFloat(amount);
    if (!name || !amount.trim() || isNaN(amountNum) || amountNum <= 0) {
      return toast({ title: "خطأ", description: "يرجى إدخال اسم ومبلغ صحيحين.", variant: "destructive" });
    }
        
    try {
        const existingRecord = debtRecords.find(r => r.debtor_name === name);
        if (isPayment && !existingRecord) throw new Error("لا يوجد دين مسجل لهذا الاسم");
        
        const newAmount = existingRecord ? (isPayment ? existingRecord.amount - amountNum : existingRecord.amount + amountNum) : amountNum;
        if (newAmount < 0) throw new Error("مبلغ السداد أكبر من الدين.");

        if(isPayment) {
            setLastPayment(amountNum);
        } else {
            setLastPayment(null);
        }

        const recordId = name; // Use name as ID for simplicity
        const newRecord: DebtRecord = { id: recordId, debtor_name: name, amount: newAmount };

        if (user) {
            const docRef = doc(db, "users", user.uid, "debtRecords", recordId);
            if (newAmount > 0) {
                await setDoc(docRef, { debtor_name: name, amount: newAmount });
            } else {
                await deleteDoc(docRef);
            }
        } else {
            let updatedRecords = debtRecords.filter(r => r.id !== recordId);
            if (newAmount > 0) updatedRecords.push(newRecord);
            localStorage.setItem('debt-manager-records', JSON.stringify(updatedRecords));
            setDebtRecords(updatedRecords.sort((a, b) => b.amount - a.amount));
        }

        const actionText = isPayment ? "سداد" : "تسجيل";
        const message = newAmount <= 0 
            ? `تم تسديد دين ${name} بالكامل.`
            : (isPayment ? `تم سداد ${formatNumber(amountNum)}. المتبقي: ${formatNumber(newAmount)}` : `تم تحديث دين ${name}. المبلغ الجديد: ${formatNumber(newAmount)}`);
        toast({ title: `تمت عملية ال${actionText}`, description: message });

        setDebtorName("");
        setAmount("");

    } catch(error: any) {
        console.error("Error updating debt:", error);
        toast({ title: "خطأ", description: error.message || "فشلت عملية تحديث الدين.", variant: "destructive" });
    }
  };
  
  const selectedDebtorRecord = selectedDebtor ? debtRecords.find(s => s.debtor_name === selectedDebtor) : null;

  const handleGenerateInvoice = async () => {
    if (!selectedDebtorRecord || !user || !lastPayment) return;
    setIsGeneratingInvoice(true);
    setIsInvoiceDialogOpen(true);
    setInvoice(null);
    try {
      const result = await generateInvoice({
        debtorName: selectedDebtorRecord.debtor_name,
        debtAmount: selectedDebtorRecord.amount,
        creditorName: user.displayName || "صاحب الدين",
      });
      setInvoice(result);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({ title: "خطأ في الذكاء الاصطناعي", description: "لم نتمكن من إنشاء الفاتورة.", variant: "destructive" });
      setIsInvoiceDialogOpen(false);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const refreshData = useCallback(() => {
    if (!user) {
        fetchDataFromLocalStorage();
        toast({ title: "تم تحديث البيانات المحلية."});
    } else {
      toast({ title: "تم التحديث", description: "البيانات السحابية محدثة باستمرار." });
    }
  }, [user, toast]);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <RefreshCw className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
    );
  }

  return (
    <div dir="rtl" className="p-4 app-container">
      <AuthDialog 
        open={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
        onAuthSuccess={handleAuthSuccess} 
      />
      <div className="absolute top-4 left-4 z-50 no-print">
        <ThemeToggle />
      </div>

      <div className="max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-card shadow-lg no-print">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                  نظام إدارة الديون
                </CardTitle>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  {user ? (
                      <div className="flex items-center gap-3">
                          <UserIcon className="h-5 w-5 text-green-400" />
                          <span>{user.displayName || user.email}</span>
                          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 rounded-full">
                              <LogOut className="h-5 w-5"/>
                              <span className="sr-only">تسجيل الخروج</span>
                          </Button>
                      </div>
                  ) : (
                      <Button onClick={() => setIsAuthDialogOpen(true)}>
                          <LogIn className="ml-2 h-5 w-5"/>
                          تسجيل الدخول / حساب جديد
                      </Button>
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
                    />
                    <Input
                      placeholder="المبلغ"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => recordOrPayDebt(true)}
                    className="bg-success hover:bg-success/90 text-success-foreground font-semibold py-2"
                    disabled={isSyncing}
                  >
                    تسديد الدين
                  </Button>
                  <Button
                    onClick={() => recordOrPayDebt(false)}
                    className="bg-debt-accent hover:bg-debt-accent/90 text-white font-semibold py-2"
                    disabled={isSyncing}
                  >
                    تسجيل دين
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={refreshData}
                      variant="outline"
                      className="w-full py-2 font-semibold"
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`h-5 w-5 ml-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      تحديث القائمة
                    </Button>
                    <Button
                      onClick={handleGenerateInvoice}
                      disabled={!selectedDebtorRecord || isGeneratingInvoice || isSyncing || !user || !lastPayment}
                      variant="outline"
                      className="w-full py-2 font-semibold border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <FileText className="h-5 w-5 ml-2" />
                      إنشاء فاتورة
                    </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card shadow-lg no-print">
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
                    className="pr-10"
                  />
                </div>
                {isSyncing ? (
                    <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">جاري المزامنة...</p>
                    </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto p-2 border rounded-lg bg-background/50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => (
                          <Card
                            key={record.id}
                            className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                              selectedDebtor === record.debtor_name 
                                ? 'bg-debt-accent text-white border-debt-accent' 
                                : 'bg-debt-card hover:bg-accent/50'
                            }`}
                            onClick={() => {
                              setSelectedDebtor(record.debtor_name);
                              setDebtorName(record.debtor_name);
                              setAmount("");
                              setLastPayment(null);
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
                        {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد ديون مسجلة"}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 no-print">
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
                    onKeyPress={(e) => e.key === 'Enter' && addLocalName()}
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
                    className="pr-10"
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
                              disabled={isSyncing}
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
      
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md printable-content">
          <DialogHeader>
            <DialogTitle>فاتورة دين</DialogTitle>
            <DialogDescription>
              هذه فاتورة تم إنشاؤها للدين المحدد.
            </DialogDescription>
          </DialogHeader>
          <div className="printable-area">
            {isGeneratingInvoice ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="mr-4">جاري إنشاء الفاتورة...</p>
              </div>
            ) : invoice && selectedDebtorRecord ? (
              <div ref={invoicePrintRef} className="space-y-4 py-4 border-t border-b p-4 my-4 bg-background text-foreground">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-primary">فاتورة</h3>
                  <span className="text-sm text-muted-foreground">{invoice.invoiceNumber}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <h4 className="font-semibold text-sm">إلى:</h4>
                      <p>{selectedDebtorRecord.debtor_name}</p>
                  </div>
                  <div>
                      <h4 className="font-semibold text-sm">من:</h4>
                      <p>{user?.displayName}</p>
                  </div>
                  <div>
                      <h4 className="font-semibold text-sm">تاريخ الإصدار:</h4>
                      <p>{invoice.issueDate}</p>
                  </div>
                  <div>
                      <h4 className="font-semibold text-sm">تاريخ الاستحقاق:</h4>
                      <p>{invoice.dueDate}</p>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-2">
                   <div className="flex justify-between items-center">
                      <span>المبلغ الإجمالي</span>
                      <span className="font-bold">{formatNumber(selectedDebtorRecord.amount + (lastPayment || 0))} دينار</span>
                   </div>
                   <div className="flex justify-between items-center text-success">
                      <span>المدفوع</span>
                      <span className="font-bold">{formatNumber(lastPayment || 0)} دينار</span>
                   </div>
                   <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                      <span>المبلغ المتبقي</span>
                      <span className="text-debt-accent">{formatNumber(selectedDebtorRecord.amount)} دينار</span>
                   </div>
                </div>
              </div>
            ) : (
               <div className="text-center p-8">
                  <p>لم نتمكن من إنشاء الفاتورة. يرجى المحاولة مرة أخرى.</p>
               </div>
            )}
          </div>
          <DialogFooter className="sm:justify-start no-print">
            <Button onClick={() => setIsInvoiceDialogOpen(false)} variant="outline">إغلاق</Button>
            <Button onClick={handlePrint} disabled={isGeneratingInvoice || !invoice}>
              <Printer className="ml-2 h-4 w-4" />
              طباعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
