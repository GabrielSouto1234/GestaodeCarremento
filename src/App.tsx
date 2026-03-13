import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  History, 
  ChevronRight, 
  ChevronLeft, 
  Camera as CameraIcon, 
  CheckCircle2, 
  FileText, 
  Download, 
  Search,
  LogOut,
  User,
  AlertCircle,
  Truck,
  Wifi,
  Lock,
  Users,
  Settings,
  Smartphone,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Select } from './components/Select';
import { Card } from './components/Card';
import { Camera } from './components/Camera';
import { AppStep, TruckType, InspectionReport, TruckPhoto, AuthorizedDevice } from './types';
import { TRUCK_TYPES, CHECKLIST_ITEMS, PHOTO_STEPS } from './constants';
import { reportService } from './services/reportService';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<AppStep>('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIpVerified, setIsIpVerified] = useState<boolean | null>(null);
  const [isCheckingIp, setIsCheckingIp] = useState(true);
  const [currentIp, setCurrentIp] = useState('');

  // WiFi Setup State
  const [wifiLogin, setWifiLogin] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiError, setWifiError] = useState('');

  // Admin Dashboard State
  const [authorizedDevices, setAuthorizedDevices] = useState<AuthorizedDevice[]>([]);
  const [manualIp, setManualIp] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientName: '',
    driverName: '',
    truckPlate: '',
    driverPlate: '',
    invoiceNumbers: '',
    truckType: 'Baú' as TruckType,
    observations: '',
  });

  const [protocol, setProtocol] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean | null>>({
    painting: null,
    externalStructure: null,
    floor: null,
    internalSides: null,
    seal: null,
    roof: null,
  });

  const [photos, setPhotos] = useState<TruckPhoto[]>(
    PHOTO_STEPS.map(s => ({ id: s.id, label: s.label, dataUrl: null }))
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // History State
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIp = async () => {
      setIsCheckingIp(true);
      const ip = await reportService.getCurrentIp();
      setCurrentIp(ip);
      const authorized = await reportService.isIpAuthorized(ip);
      setIsIpVerified(authorized);
      if (!authorized) {
        setStep('wifi-setup');
      }
      setIsCheckingIp(false);
    };

    checkIp();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        loadReports(user.uid);
      }
    });
    return unsubscribe;
  }, []);

  const loadReports = async (uid: string) => {
    try {
      const data = await reportService.getReports(uid);
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadAuthorizedDevices = async () => {
    try {
      const data = await reportService.getAllAuthorizedIPs();
      setAuthorizedDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const handleWifiRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wifiLogin === 'admingk' && wifiPassword === 'admin') {
      setIsSubmitting(true);
      try {
        await reportService.registerIp(currentIp, 'Auto Setup');
        setIsIpVerified(true);
        setStep('home');
      } catch (error) {
        setWifiError('Erro ao registrar IP. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setWifiError('Login ou senha incorretos.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (wifiLogin === 'admingk' && wifiPassword === 'admin') {
      setIsAdminLoggedIn(true);
      setStep('admin-dashboard');
      loadAuthorizedDevices();
      setWifiLogin('');
      setWifiPassword('');
      setWifiError('');
    } else {
      setWifiError('Login ou senha incorretos.');
    }
  };

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await reportService.registerIp(manualIp, 'Admin Manual', manualPhone);
      setManualIp('');
      setManualPhone('');
      await loadAuthorizedDevices();
      // Auto exit as requested
      setStep('home');
    } catch (error) {
      console.error('Error registering IP:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (confirm('Deseja remover este dispositivo?')) {
      try {
        await reportService.deleteAuthorizedIp(id);
        await loadAuthorizedDevices();
      } catch (error) {
        console.error('Error deleting device:', error);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStep('home');
  };

  const startNewChecklist = () => {
    setFormData({
      clientName: '',
      driverName: '',
      truckPlate: '',
      driverPlate: '',
      invoiceNumbers: '',
      truckType: 'Baú',
      observations: '',
    });
    setChecklist({
      painting: null,
      externalStructure: null,
      floor: null,
      internalSides: null,
      seal: null,
      roof: null,
    });
    setPhotos(PHOTO_STEPS.map(s => ({ id: s.id, label: s.label, dataUrl: null })));
    setProtocol('');
    setStep('form');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newProtocol = await reportService.getNextProtocol(formData.clientName);
      setProtocol(newProtocol);
      setStep('checklist');
    } catch (error) {
      console.error('Error generating protocol:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChecklistChange = (id: string, value: boolean) => {
    setChecklist(prev => ({ ...prev, [id]: value }));
  };

  const isChecklistComplete = Object.values(checklist).every(v => v !== null);

  const capturePhoto = (dataUrl: string) => {
    if (activePhotoIndex !== null) {
      setPhotos(prev => prev.map((p, i) => i === activePhotoIndex ? { ...p, dataUrl } : p));
      setActivePhotoIndex(null);
    }
  };

  const handleSendReport = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // 1. Upload photos
      const photoUrls = await Promise.all(
        photos.map((p, i) => reportService.uploadPhoto(p.dataUrl!, protocol, i + 1))
      );

      // 2. Save report
      const reportData: Omit<InspectionReport, 'id' | 'createdAt'> = {
        protocol,
        clientName: formData.clientName,
        driverName: formData.driverName,
        truckPlate: formData.truckPlate,
        driverPlate: formData.driverPlate,
        invoiceNumbers: formData.invoiceNumbers,
        truckType: formData.truckType,
        observations: formData.observations,
        checklist: checklist as any,
        photos: photoUrls,
        status: 'ENVIADO',
        createdBy: user.uid,
      };

      await reportService.saveReport(reportData);
      await loadReports(user.uid);
      setStep('home');
      alert('Relatório enviado com sucesso!');
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Erro ao enviar relatório. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${protocol || selectedReport?.protocol}.pdf`);
  };

  if (loading || isCheckingIp) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          {isCheckingIp ? 'Verificando rede...' : 'Carregando...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-200">
          <Truck className="h-10 w-10" />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">CheckTruck</h1>
        <p className="mb-8 max-w-xs text-slate-500">
          Sistema profissional de inspeção e checklist de caminhões.
        </p>
        <Button onClick={handleLogin} size="lg" className="w-full max-w-xs">
          Entrar com Google
        </Button>
      </div>
    );
  }

  return (
    <Layout protocol={protocol} hideHeader={step === 'wifi-setup' || step === 'admin-login'}>
      {step === 'wifi-setup' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-xl shadow-amber-50">
            <Wifi className="h-10 w-10" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Rede não autorizada</h2>
            <p className="text-slate-500 max-w-xs mx-auto">
              Este dispositivo não está conectado ao WiFi da empresa ou seu IP ({currentIp}) não está cadastrado.
            </p>
          </div>

          <Card className="w-full max-w-sm p-6 space-y-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Acesso Administrativo</span>
            </div>

            <form onSubmit={handleWifiRegister} className="space-y-4">
              <Input 
                label="Login Admin" 
                placeholder="Digite o login" 
                value={wifiLogin}
                onChange={e => setWifiLogin(e.target.value)}
                required
              />
              <Input 
                label="Senha Admin" 
                type="password" 
                placeholder="Digite a senha" 
                value={wifiPassword}
                onChange={e => setWifiPassword(e.target.value)}
                required
              />
              
              {wifiError && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {wifiError}
                </div>
              )}

              <Button type="submit" className="w-full h-12" isLoading={isSubmitting}>
                Cadastrar WiFi / IP
              </Button>
            </form>
          </Card>
        </div>
      )}

      {step === 'admin-login' && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-blue-600 shadow-xl shadow-blue-50">
            <ShieldCheck className="h-10 w-10" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Painel Administrativo</h2>
            <p className="text-sm text-slate-500">Faça login para gerenciar dispositivos</p>
          </div>

          <Card className="w-full max-w-sm p-6 space-y-6">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <Input 
                label="Login" 
                placeholder="Digite o login" 
                value={wifiLogin}
                onChange={e => setWifiLogin(e.target.value)}
                required
              />
              <Input 
                label="Senha" 
                type="password" 
                placeholder="Digite a senha" 
                value={wifiPassword}
                onChange={e => setWifiPassword(e.target.value)}
                required
              />
              
              {wifiError && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {wifiError}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep('home')}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Entrar
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {step === 'admin-dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setStep('home')}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-2xl font-bold text-slate-900">Gerenciar Dispositivos</h2>
            </div>
            <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              ADMIN
            </div>
          </div>

          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Plus className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Cadastrar Novo Dispositivo</span>
            </div>

            <form onSubmit={handleManualRegister} className="grid gap-4 sm:grid-cols-2">
              <Input 
                label="Endereço IP" 
                placeholder="Ex: 192.168.1.1" 
                value={manualIp}
                onChange={e => setManualIp(e.target.value)}
                required
              />
              <Input 
                label="Número do Celular" 
                placeholder="Ex: (11) 99999-9999" 
                value={manualPhone}
                onChange={e => setManualPhone(e.target.value)}
                required
              />
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full h-12" isLoading={isSubmitting}>
                  Salvar e Sair
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400 px-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Dispositivos Cadastrados ({authorizedDevices.length})</span>
            </div>

            <div className="grid gap-4">
              {authorizedDevices.map((device) => (
                <Card key={device.id} className="p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{device.ip}</span>
                        {device.phoneNumber && (
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                            {device.phoneNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <History className="h-3 w-3" />
                        Último uso: {device.lastUsed ? format(device.lastUsed.toDate(), "dd/MM/yy 'às' HH:mm", { locale: ptBR }) : 'Nunca usado'}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteDevice(device.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
              {authorizedDevices.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  Nenhum dispositivo cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'home' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Olá, {user.displayName?.split(' ')[0]}</h2>
              <p className="text-sm text-slate-500">O que deseja fazer hoje?</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
              <LogOut className="h-5 w-5 text-slate-400" />
            </Button>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startNewChecklist}
                className="group relative flex flex-col items-start gap-4 rounded-3xl border border-blue-100 bg-blue-600 p-6 text-white shadow-xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform group-hover:rotate-12">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-lg font-bold">Check List</span>
                  <span className="text-[10px] text-blue-100 uppercase tracking-wider font-bold">Novo</span>
                </div>
              </button>

              <button
                onClick={() => setStep('history')}
                className="group relative flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:scale-[1.02] active:scale-95"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-transform group-hover:rotate-12">
                  <History className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="block text-lg font-bold">Histórico</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Relatórios</span>
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep('admin-login')}
              className="group flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-transform group-hover:scale-110">
                  <Settings className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">Administrador</span>
                  <span className="text-xs text-slate-500">Gerenciar IPs e Dispositivos</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('home')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">Cadastro do Envio</h2>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <Input
              label="Nome do Cliente"
              placeholder="Ex: Transportadora Silva"
              required
              value={formData.clientName}
              onChange={e => setFormData({ ...formData, clientName: e.target.value })}
            />
            <Input
              label="Nome do Motorista"
              placeholder="Nome completo"
              required
              value={formData.driverName}
              onChange={e => setFormData({ ...formData, driverName: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Placa do Cavalo"
                placeholder="ABC-1234"
                required
                value={formData.truckPlate}
                onChange={e => setFormData({ ...formData, truckPlate: e.target.value })}
              />
              <Input
                label="Placa do Motorista"
                placeholder="XYZ-5678"
                required
                value={formData.driverPlate}
                onChange={e => setFormData({ ...formData, driverPlate: e.target.value })}
              />
            </div>
            <Input
              label="Número das Notas Fiscais"
              placeholder="12345, 12346, 12347"
              required
              value={formData.invoiceNumbers}
              onChange={e => setFormData({ ...formData, invoiceNumbers: e.target.value })}
            />
            <Select
              label="Tipo de Caminhão"
              options={TRUCK_TYPES.map(t => ({ value: t, label: t }))}
              value={formData.truckType}
              onChange={e => setFormData({ ...formData, truckType: e.target.value as TruckType })}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">
                Observações
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                placeholder="Alguma observação adicional?"
                value={formData.observations}
                onChange={e => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('home')}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                Salvar e continuar
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 'checklist' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('form')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">Check List de Avarias</h2>
          </div>

          <div className="space-y-4">
            {CHECKLIST_ITEMS.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleChecklistChange(item.id, true)}
                      className={cn(
                        "flex h-10 w-16 items-center justify-center rounded-lg border text-sm font-bold transition-all",
                        checklist[item.id] === true 
                          ? "bg-red-50 border-red-200 text-red-600" 
                          : "bg-white border-slate-200 text-slate-400"
                      )}
                    >
                      SIM
                    </button>
                    <button
                      onClick={() => handleChecklistChange(item.id, false)}
                      className={cn(
                        "flex h-10 w-16 items-center justify-center rounded-lg border text-sm font-bold transition-all",
                        checklist[item.id] === false 
                          ? "bg-green-50 border-green-200 text-green-600" 
                          : "bg-white border-slate-200 text-slate-400"
                      )}
                    >
                      NÃO
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>
              Voltar
            </Button>
            <Button 
              className="flex-1" 
              disabled={!isChecklistComplete}
              onClick={() => setStep('photos')}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {step === 'photos' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('checklist')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">Captura de Fotos</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {photos.map((photo, index) => (
              <Card key={photo.id} className="p-4 overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Foto {photo.id}</span>
                    <h4 className="font-bold text-slate-800">{photo.label}</h4>
                  </div>
                  {photo.dataUrl ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                      <img src={photo.dataUrl} className="h-full w-full object-cover" alt={photo.label} />
                      <button 
                        onClick={() => setActivePhotoIndex(index)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <CameraIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setActivePhotoIndex(index)}
                      className="gap-2"
                    >
                      <CameraIcon className="h-4 w-4" />
                      Adicionar
                    </Button>
                  )}
                </div>
                {photo.dataUrl && (
                  <div className="mt-2 text-[10px] font-bold text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Foto carregada com sucesso
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setStep('checklist')}>
              Voltar
            </Button>
            <Button 
              className="flex-1" 
              disabled={photos.some(p => !p.dataUrl)}
              onClick={() => setStep('review')}
            >
              Próximo
            </Button>
          </div>

          {activePhotoIndex !== null && (
            <Camera 
              onCapture={capturePhoto} 
              onClose={() => setActivePhotoIndex(null)} 
            />
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('photos')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">Relatório Final</h2>
          </div>

          <div ref={reportRef} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Protocolo</span>
              <h3 className="text-xl font-black text-slate-900">{protocol}</h3>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cliente</span>
                <p className="text-sm font-semibold">{formData.clientName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Motorista</span>
                <p className="text-sm font-semibold">{formData.driverName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Placa Cavalo</span>
                <p className="text-sm font-semibold">{formData.truckPlate}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Placa Motorista</span>
                <p className="text-sm font-semibold">{formData.driverPlate}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Notas Fiscais</span>
                <p className="text-sm font-semibold">{formData.invoiceNumbers}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo</span>
                <p className="text-sm font-semibold">{formData.truckType}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Checklist</span>
              <div className="grid grid-cols-1 gap-1">
                {CHECKLIST_ITEMS.map(item => (
                  <div key={item.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">{item.label}</span>
                    <span className={cn("font-bold", checklist[item.id] ? "text-red-600" : "text-green-600")}>
                      {checklist[item.id] ? "SIM" : "NÃO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {formData.observations && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Observações</span>
                <p className="text-xs text-slate-600 mt-1">{formData.observations}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Galeria de Fotos</span>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, idx) => (
                  <div 
                    key={photo.id} 
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 group"
                    onClick={() => setActivePhotoIndex(idx)}
                  >
                    <img src={photo.dataUrl!} className="h-full w-full object-cover" alt={photo.label} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[8px] text-white font-bold uppercase">Substituir</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button className="w-full h-14" isLoading={isSubmitting} onClick={handleSendReport}>
              Enviar relatório
            </Button>
            <Button variant="outline" className="w-full" onClick={generatePDF}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('photos')}>
              Voltar
            </Button>
          </div>

          {activePhotoIndex !== null && (
            <Camera 
              onCapture={capturePhoto} 
              onClose={() => setActivePhotoIndex(null)} 
            />
          )}
        </div>
      )}

      {step === 'history' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('home')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">Consultar Relatórios</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              className="pl-10" 
              placeholder="Protocolo, cliente, placa..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {reports
              .filter(r => 
                r.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.truckPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.driverName.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((report) => (
                <Card 
                  key={report.id} 
                  className="p-4 active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedReport(report);
                    setStep('view-report');
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">{report.protocol}</h4>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-slate-500">Motorista: <span className="font-medium text-slate-700">{report.driverName}</span></p>
                        <p className="text-xs text-slate-500">Placa: <span className="font-medium text-slate-700">{report.truckPlate}</span></p>
                        <p className="text-xs text-slate-500">Data: <span className="font-medium text-slate-700">
                          {report.createdAt?.toDate ? format(report.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '---'}
                        </span></p>
                      </div>
                    </div>
                    <div className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600 uppercase">
                      {report.status}
                    </div>
                  </div>
                </Card>
              ))}

            {reports.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-slate-900">Nenhum relatório encontrado</h3>
                <p className="text-sm text-slate-500">Você ainda não enviou nenhuma inspeção.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'view-report' && selectedReport && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('history')}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl font-bold">Detalhes do Relatório</h2>
          </div>

          <div ref={reportRef} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Protocolo</span>
              <h3 className="text-xl font-black text-slate-900">{selectedReport.protocol}</h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Enviado em: {selectedReport.createdAt?.toDate ? format(selectedReport.createdAt.toDate(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : '---'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cliente</span>
                <p className="text-sm font-semibold">{selectedReport.clientName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Motorista</span>
                <p className="text-sm font-semibold">{selectedReport.driverName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Placa Cavalo</span>
                <p className="text-sm font-semibold">{selectedReport.truckPlate}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Placa Motorista</span>
                <p className="text-sm font-semibold">{selectedReport.driverPlate}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Notas Fiscais</span>
                <p className="text-sm font-semibold">{selectedReport.invoiceNumbers}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo</span>
                <p className="text-sm font-semibold">{selectedReport.truckType}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Checklist</span>
              <div className="grid grid-cols-1 gap-1">
                {CHECKLIST_ITEMS.map(item => (
                  <div key={item.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600">{item.label}</span>
                    <span className={cn("font-bold", (selectedReport.checklist as any)[item.id] ? "text-red-600" : "text-green-600")}>
                      {(selectedReport.checklist as any)[item.id] ? "SIM" : "NÃO"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedReport.observations && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Observações</span>
                <p className="text-xs text-slate-600 mt-1">{selectedReport.observations}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Fotos da Inspeção</span>
              <div className="grid grid-cols-3 gap-2">
                {selectedReport.photos.map((url, idx) => (
                  <div 
                    key={idx} 
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-100"
                  >
                    <img src={url} className="h-full w-full object-cover" alt={`Foto ${idx + 1}`} referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button className="w-full h-14" onClick={generatePDF}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setStep('history')}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
