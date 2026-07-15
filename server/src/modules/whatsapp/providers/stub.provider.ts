import { logger } from "../../../shared/logger";
import { IWhatsAppProvider, WhatsAppSendResult } from "../whatsapp.types";

// Default provider: no WhatsApp account/API is set up yet. Logs the rendered
// message instead of sending it, so the rest of the system is fully testable
// today. Swap `settings.whatsapp_provider` to a real provider once one exists.
export class StubWhatsAppProvider implements IWhatsAppProvider {
  readonly name = "stub";

  async sendMessage(params: {
    to: string;
    templateKey: string;
    params: Record<string, string | number>;
  }): Promise<WhatsAppSendResult> {
    logger.info({ to: params.to, templateKey: params.templateKey, params: params.params }, "[WhatsApp:stub] message logged (not sent)");
    return { status: "sent", providerMessageId: `stub-${Date.now()}` };
  }
}
