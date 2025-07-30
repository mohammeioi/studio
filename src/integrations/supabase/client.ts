// src/components/debt-flow/debt-flow-client.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Home, Edit, RefreshCw, X } from "lucide-react";

interface DebtRecord {
  debtor_name: string;
  amount: number;
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
  
  // Format number with commas and remove unnecessary decimals
  const formatNumber = (num: number): string => {
    const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
    return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  // Local names management
  const [localNames, setLocalNames] = useState<string[]>([]);
  const [newLocalName, setNewLocalName] = useState("");
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [filteredLocalNames, setFilteredLocalNames] = useState<string[]>([]);

  // --- LocalStorage Functions ---
  const fetchDataFromLocalStorage = () => {
    setLoading(true);
    try {
      const savedDebts = localStorage.getItem('debt-manager-records');
      const savedNames = localStorage.getItem('debt-manager-local-names');
      
      const debtData = savedDebts ? JSON.parse(savedDebts) : [];
      const namesData = savedNames ? JSON.parse(savedNames) : [];
      
      setDebtRecords(debtData.sort((a: DebtRecord, b: DebtRecord) => b.amount - a.amount));
      setLocalNames(namesData);

    } catch (error) {
      console.error('Error fetching data from localStorage:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في تحميل البيانات من المتصفح",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchDataFromLocalStorage();
  }, []);

  // Filter debt records based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredRecords(debtRecords);
    } else {
      const filtered = debtRecords.filter(record =>
        record.debtor_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecords(filtered);
    }
  }, [searchTerm, debtRecords]);

  // Filter local names based on search term
  useEffect(() => {
    if (localSearchTerm.trim() === "") {
      setFilteredLocalNames(localNames);
    } else {
      const filtered = localNames.filter(name =>
        name.toLowerCase().includes(localSearchTerm.toLowerCase())
      );
      setFilteredLocalNames(filtered);
    }
  }, [localSearchTerm, localNames]);


  // Add new local name
  const addLocalName = () => {
    if (!newLocalName.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم صحيح", variant: "destructive" });
      return;
    }
    if (localNames.includes(newLocalName.trim())) {
      toast({ title: "خطأ", description: "هذا الاسم موجود بالفعل", variant: "destructive" });
      return;
    }

    const updatedNames = [...localNames, newLocalName.trim()];
    setLocalNames(updatedNames);
    localStorage.setItem('debt-manager-local-names', JSON.stringify(updatedNames));
    setNewLocalName("");
    toast({ title: "تم الإضافة", description: `تم إضافة ${newLocalName} للقائمة` });
  };

  // Remove local name
  const removeLocalName = (nameToRemove: string) => {
    const updatedNames = localNames.filter(name => name !== nameToRemove);
    setLocalNames(updatedNames);
    localStorage.setItem('debt-manager-local-names', JSON.stringify(updatedNames));
    toast({ title: "تم الحذف", description: `تم حذف ${nameToRemove} من القائمة` });
  };

  // Record a new debt or update existing one
  const recordDebt = () => {
    if (!debtorName.trim() || !amount.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المدين والمبلغ", variant: "destructive" });
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);
    const updatedRecords = [...debtRecords];
    const existingRecordIndex = updatedRecords.findIndex(r => r.debtor_name === debtorName.trim());

    if (existingRecordIndex > -1) {
      updatedRecords[existingRecordIndex].amount += amountNum;
    } else {
      updatedRecords.push({ debtor_name: debtorName.trim(), amount: amountNum });
    }
    
    localStorage.setItem('debt-manager-records', JSON.stringify(updatedRecords));
    setDebtRecords(updatedRecords.sort((a, b) => b.amount - a.amount));

    toast({ title: "تم التسجيل", description: `تم تسجيل دين لـ ${debtorName} بمبلغ ${formatNumber(amountNum)} دينار` });
    setDebtorName("");
    setAmount("");
    setLoading(false);
  };

  // Pay debt
  const payDebt = () => {
    if (!debtorName.trim() || !amount.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم المدين والمبلغ", variant: "destructive" });
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);
    let updatedRecords = [...debtRecords];
    const existingRecordIndex = updatedRecords.findIndex(r => r.debtor_name === debtorName.trim());

    if (existingRecordIndex === -1) {
      toast({ title: "خطأ", description: "لا يوجد دين مسجل لهذا الاسم", variant: "destructive" });
      setLoading(false);
      return;
    }

    const newAmount = updatedRecords[existingRecordIndex].amount - amountNum;

    if (newAmount <= 0) {
      updatedRecords.splice(existingRecordIndex, 1);
      toast({ title: "تم التسديد الكامل", description: `تم تسديد دين ${debtorName} بالكامل` });
    } else {
      updatedRecords[existingRecordIndex].amount = newAmount;
      toast({ title: "تم التسديد الجزئي", description: `تم تسديد ${formatNumber(amountNum)} دينار. المبلغ المتبقي: ${formatNumber(newAmount)} دينار` });
    }
    
    localStorage.setItem('debt-manager-records', JSON.stringify(updatedRecords));
    setDebtRecords(updatedRecords.sort((a, b) => b.amount - a.amount));

    setDebtorName("");
    setAmount("");
    setLoading(false);
  };

  const selectedDebtorRecord = selectedDebtor 
    ? debtRecords.find(s => s.debtor_name === selectedDebtor)
    : null;

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-card shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                  <Edit className="h-6 w-6 text-primary" />
                  نظام إدارة الديون (تخزين محلي)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected Debtor Summary */}
                {selectedDebtorRecord && (
                  <div className="p-4 bg-debt-card rounded-lg border-2 border-debt-accent text-center">
                    <p className="text-lg">
                      إجمالي ديون {selectedDebtorRecord.debtor_name}: 
                      <span className="font-bold text-debt-accent"> {formatNumber(selectedDebtorRecord.amount)} دينار</span>
                    </p>
                  </div>
                )}

                {/* Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="الاسم"
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      className="text-right"
                    />
                    <Input
                      placeholder="المبلغ"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-right"
                    />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={payDebt}
                    className="bg-success hover:bg-success/90 text-success-foreground font-semibold py-3"
                    disabled={loading}
                  >
                    <Home className="h-5 w-5 ml-2" />
                    تسديد الدين
                  </Button>
                  <Button
                    onClick={recordDebt}
                    className="bg-debt-accent hover:bg-debt-accent/90 text-white font-semibold py-3"
                    disabled={loading}
                  >
                    <Edit className="h-5 w-5 ml-2" />
                    تسجيل دين
                  </Button>
                </div>

                <Button
                  onClick={fetchDataFromLocalStorage}
                  variant="outline"
                  className="w-full py-3 font-semibold"
                  disabled={loading}
                >
                  <RefreshCw className={`h-5 w-5 ml-2 ${loading ? 'animate-spin' : ''}`} />
                  تحديث القائمة
                </Button>

              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Local Names */}
          <div className="lg:col-span-1">
            <Card className="bg-card shadow-lg sticky top-4">
              <CardHeader>
                <CardTitle className="text-xl text-center">
                  الأسماء المحفوظة ({filteredLocalNames.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new local name */}
                <div className="space-y-2">
                  <Input
                    placeholder="أدخل اسم جديد..."
                    value={newLocalName}
                    onChange={(e) => setNewLocalName(e.target.value)}
                    className="text-right"
                    onKeyPress={(e) => e.key === 'Enter' && addLocalName()}
                  />
                  <Button
                    onClick={addLocalName}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة للقائمة
                  </Button>
                </div>

                {/* Search local names */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في الأسماء..."
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    className="text-right pr-10"
                  />
                </div>

                {/* Local Names List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredLocalNames.length > 0 ? (
                    filteredLocalNames.map((name) => (
                      <Card
                        key={name}
                        className="cursor-pointer transition-colors hover:bg-accent/50 bg-debt-card"
                        onClick={() => {
                          setDebtorName(name);
                          setAmount("");
                          const record = debtRecords.find(r => r.debtor_name === name);
                          setSelectedDebtor(record ? name : null);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLocalName(name);
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

        {/* Database Names Section */}
        <div className="mt-6">
          <Card className="bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-center">
                الديون المسجلة ({debtRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search database names */}
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>

              {loading ? (
                <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : filteredRecords.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredRecords.map((record) => (
                      <Card
                        key={record.debtor_name}
                        className={`cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                          selectedDebtor === record.debtor_name 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-card hover:bg-accent/50'
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
                               ? 'text-primary-foreground' 
                               : 'text-primary'
                           }`}>
                             {formatNumber(record.amount)} د
                           </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "لا توجد نتائج للبحث" : "لا توجد ديون مسجلة"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};