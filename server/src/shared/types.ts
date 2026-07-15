export interface AdminJwtPayload {
  adminId: number;
  name: string;
  email: string;
  branchId: number | null; // null = super-admin, sees all branches
}

export interface DeviceAuthContext {
  deviceId: number;
  branchId: number;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
      device?: DeviceAuthContext;
    }
  }
}

export {};
