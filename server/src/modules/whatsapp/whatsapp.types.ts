export interface WhatsAppSendResult {
  providerMessageId?: string;
  status: "sent" | "failed";
  error?: string;
}

export interface IWhatsAppProvider {
  readonly name: string;
  sendMessage(params: {
    to: string;
    templateKey: string;
    params: Record<string, string | number>;
  }): Promise<WhatsAppSendResult>;
}
