export type TruckType = 'Baú' | 'Sider' | 'Graneleiro' | 'Plataforma' | 'Tanque' | 'Outro';

export interface ChecklistItem {
  id: string;
  label: string;
  value: boolean | null;
}

export interface TruckPhoto {
  id: number;
  label: string;
  dataUrl: string | null;
}

export interface InspectionReport {
  id?: string;
  protocol: string;
  clientName: string;
  driverName: string;
  truckPlate: string;
  driverPlate: string;
  invoiceNumbers: string;
  truckType: TruckType;
  observations: string;
  checklist: {
    painting: boolean;
    externalStructure: boolean;
    floor: boolean;
    internalSides: boolean;
    seal: boolean;
    roof: boolean;
  };
  photos: string[]; // URLs from Firebase Storage
  status: 'ENVIADO';
  createdAt: any; // Firebase Timestamp
  createdBy: string;
}

export interface AuthorizedDevice {
  id: string;
  ip: string;
  phoneNumber?: string;
  registeredAt: any;
  registeredBy: string;
  lastUsed?: any;
}

export type AppStep = 'wifi-setup' | 'admin-login' | 'admin-dashboard' | 'home' | 'form' | 'checklist' | 'photos' | 'review' | 'history' | 'view-report';
