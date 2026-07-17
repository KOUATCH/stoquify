// Presence Monitoring Types

export type PresenceStatus =
  | 'CLOCKED_IN'
  | 'ON_BREAK'
  | 'CLOCKED_OUT'
  | 'OVERTIME'
  | 'LATE'
  | 'ABSENT'
  | 'OFFLINE';

export type ClockMethod =
  | 'MANUAL'
  | 'BIOMETRIC'
  | 'CARD_SWIPE'
  | 'MOBILE_APP'
  | 'WEB_BROWSER'
  | 'QR_CODE'
  | 'NFC'
  | 'GEOFENCE';

export type ActivityType =
  | 'CLOCK_IN'
  | 'CLOCK_OUT'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'TASK_START'
  | 'TASK_END'
  | 'SYSTEM_LOGIN'
  | 'SYSTEM_LOGOUT'
  | 'POS_TRANSACTION'
  | 'INVENTORY_UPDATE'
  | 'CUSTOMER_SERVICE'
  | 'CLEANING'
  | 'RESTOCKING'
  | 'TRAINING'
  | 'MEETING'
  | 'ADMIN_TASK'
  | 'SYSTEM_IDLE'
  | 'SYSTEM_ACTIVE'
  | 'LOCATION_CHANGE'
  | 'OTHER';

export type BreakType =
  | 'LUNCH'
  | 'SHORT_BREAK'
  | 'PERSONAL'
  | 'TRAINING'
  | 'MEETING'
  | 'EMERGENCY'
  | 'SICK'
  | 'REGULAR'
  | 'EXTENDED';

export type AlertType =
  | 'LATE_ARRIVAL'
  | 'EARLY_DEPARTURE'
  | 'MISSED_CLOCK_OUT'
  | 'EXTENDED_BREAK'
  | 'NO_SHOW'
  | 'OVERTIME_ALERT'
  | 'SCHEDULE_CONFLICT'
  | 'UNUSUAL_ACTIVITY'
  | 'LOCATION_MISMATCH'
  | 'SYSTEM_ERROR';

export type AlertSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'URGENT';

// Base interfaces
export interface EmployeePresenceSession {
  id: string;
  userId: string;
  locationId: string;
  organizationId: string;
  stationId?: string;
  status: PresenceStatus;
  clockInTime: Date;
  clockOutTime?: Date;
  expectedClockOutTime?: Date;
  totalMinutesWorked: number;
  totalBreakMinutes: number;
  overtime: boolean;
  overtimeMinutes: number;
  notes?: string;
  clockInMethod: ClockMethod;
  clockOutMethod?: ClockMethod;
  ipAddress?: string;
  deviceInfo?: Record<string, any>;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  approvedById?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    jobTitle?: string;
  };
  location: {
    id: string;
    name: string;
    code: string;
  };
  posStation?: {
    id: string;
    name: string;
    stationNumber: string;
  };
  breakSessions: EmployeeBreakSession[];
  activityLogs: EmployeeActivityLog[];
}

export interface EmployeeActivityLog {
  id: string;
  presenceSessionId: string;
  userId: string;
  activityType: ActivityType;
  description?: string;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, any>;
  systemGenerated: boolean;
}

export interface EmployeeBreakSession {
  id: string;
  presenceSessionId: string;
  userId: string;
  breakType: BreakType;
  startTime: Date;
  endTime?: Date;
  expectedDuration?: number;
  actualDuration?: number;
  reason?: string;
  notes?: string;
  approvedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeSchedule {
  id: string;
  userId: string;
  organizationId: string;
  locationId?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  breakDurations?: number[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
  };
  location?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface PresenceAlert {
  id: string;
  userId: string;
  organizationId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  isRead: boolean;
  isResolved: boolean;
  resolvedById?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    jobTitle?: string;
  };
  resolver?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AttendanceReport {
  id: string;
  userId: string;
  organizationId: string;
  locationId?: string;
  reportDate: Date;
  scheduledMinutes: number;
  actualMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  lateArrivalMinutes: number;
  earlyDepartureMinutes: number;
  attendanceScore: number;
  productivity?: number;
  notes?: string;
  generatedAt: Date;
  updatedAt: Date;

  // Relations
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
  };
  location?: {
    id: string;
    name: string;
    code: string;
  };
}

// API Response types
export interface PresenceStatusResponse {
  status: PresenceStatus;
  session: (EmployeePresenceSession & {
    currentWorkDuration: number;
    isOnBreak: boolean;
    currentBreak?: EmployeeBreakSession;
  }) | null;
}

export interface OrganizationPresenceOverview {
  totalEmployees: number;
  present: number;
  clockedIn: number;
  onBreak: number;
  overtime: number;
  absent: number;
  late:number;
  offline: number;
  activeSessions: number;
  averageWorkDuration: number; // in minutes
  averageBreakDuration: number; // in minutes
  totalOvertimeHours: number; // in hours
  totalBreaksTaken: number;
  sessions: (EmployeePresenceSession & {
    currentWorkDuration: number;
    isOnBreak: boolean;
  })[];
}

export interface AttendanceAnalytics {
  summary: {
    totalReports: number;
    totalEmployees: number;
    averageAttendanceScore: number;
    totalScheduledHours: number;
    totalActualHours: number;
    totalOvertimeHours: number;
    attendanceRate: number;
  };
  topPerformers: Array<{
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      jobTitle?: string;
    };
    averageScore: number;
    reportCount: number;
  }>;
  byLocation: Record<string, {
    totalReports: number;
    totalScheduledMinutes: number;
    totalActualMinutes: number;
    averageScore: number;
  }>;
  dailyTrends: Record<string, {
    date: string;
    totalReports: number;
    averageScore: number;
    totalLateMinutes: number;
    totalOvertimeMinutes: number;
  }>;
  problemAreas: {
    chronicallyLate: Array<{
      userId: string;
      user: {
        id: string;
        name: string;
        email: string;
        jobTitle?: string;
      };
      lateCount: number;
      totalLateMinutes: number;
    }>;
    frequentAbsences: Array<{
      userId: string;
      user: {
        id: string;
        name: string;
        email: string;
        jobTitle?: string;
      };
      absenceCount: number;
    }>;
  };
}

// Form data types
export interface ClockInFormData {
  locationId: string;
  stationId?: string;
  method?: ClockMethod;
  notes?: string;
}

export interface StartBreakFormData {
  breakType?: BreakType;
  expectedDuration?: number;
  reason?: string;
  notes?: string;
}

export interface CreateScheduleFormData {
  userId: string;
  locationId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDurations?: number[];
  effectiveFrom: Date;
  effectiveUntil?: Date;
  notes?: string;
}

// Filter types
export interface PresenceFilters {
  status?: PresenceStatus[];
  locationId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  search?: string;
}

export interface AlertFilters {
  isRead?: boolean;
  isResolved?: boolean;
  severity?: AlertSeverity[];
  alertType?: AlertType[];
  userId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Constants
export const PRESENCE_STATUS_COLORS: Record<PresenceStatus, string> = {
  CLOCKED_IN: 'bg-green-100 text-green-800',
  ON_BREAK: 'bg-yellow-100 text-yellow-800',
  CLOCKED_OUT: 'bg-gray-100 text-gray-800',
  OVERTIME: 'bg-blue-100 text-blue-800',
  LATE: 'bg-orange-100 text-orange-800',
  ABSENT: 'bg-red-100 text-red-800',
  OFFLINE: 'bg-gray-100 text-gray-600'
};

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
  URGENT: 'bg-purple-100 text-purple-800'
};

export const BREAK_TYPE_LABELS: Record<BreakType, string> = {
  LUNCH: 'Lunch Break',
  SHORT_BREAK: 'Short Break',
  PERSONAL: 'Personal Break',
  TRAINING: 'Training',
  MEETING: 'Meeting',
  EMERGENCY: 'Emergency',
  SICK: 'Sick Leave',
  REGULAR: 'Regular Break',
  EXTENDED: 'Extended Break'
};

export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const CLOCK_METHODS: Record<ClockMethod, string> = {
  MANUAL: 'Manual Entry',
  BIOMETRIC: 'Biometric Scanner',
  CARD_SWIPE: 'ID Card Swipe',
  MOBILE_APP: 'Mobile App',
  WEB_BROWSER: 'Web Browser',
  QR_CODE: 'QR Code Scan',
  NFC: 'NFC Tag',
  GEOFENCE: 'Geofence Auto'
};