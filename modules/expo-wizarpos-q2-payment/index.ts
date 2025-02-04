import ExpoWizarposQ2PaymentModule from './src/ExpoWizarposQ2PaymentModule';
import { ChangeEventPayload, ExpoWizarposQ2PaymentViewProps } from './src/ExpoWizarposQ2Payment.types';

export interface UsbDevice {
  deviceName: string;
  deviceId: number;
  vendorId: number;
  productId: number;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
}

export enum RequestType {
  FROM_CASHIER = '01',
  FROM_POS = '02',
  HANDSHAKE_REQUEST = 'F1',
  HANDSHAKE_RESPONSE = 'F2',
  CANCEL_REQUEST = 'C1',
  CANCEL_RESPONSE = 'C2'
}

export interface CommandResult extends ConnectionResult {
  data?: number[];
  parsedData?: any;
  timeout?: boolean;
  command?: any;
}

export interface CommandOptions {
  requestType: RequestType;
  content: any;
  timeout?: number;
  sequenceNumber?: number;
}

export async function getDeviceList(): Promise<UsbDevice[]> {
  return await ExpoWizarposQ2PaymentModule.getDeviceList();
}

export async function openConnection(deviceId: number): Promise<ConnectionResult> {
  return await ExpoWizarposQ2PaymentModule.openConnection(deviceId);
}

export async function closeConnection(): Promise<ConnectionResult> {
  return await ExpoWizarposQ2PaymentModule.closeConnection();
}

export function sendCommand(options: CommandOptions): Promise<CommandResult> {
  return ExpoWizarposQ2PaymentModule.sendCommand(options);
}

export async function cancelCommand(): Promise<CommandResult> {
  const cancelResult = await ExpoWizarposQ2PaymentModule.cancelCommand();
  if (cancelResult.success) {
    return {
      success: true,
      message: cancelResult.message,
    };
  } else {
    return {
      success: false,
      message: cancelResult.message,
    };
  }
}

export { ExpoWizarposQ2PaymentViewProps, ChangeEventPayload };