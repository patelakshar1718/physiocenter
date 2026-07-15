import { getSetting } from "../settings/settings.service";
import { IWhatsAppProvider } from "./whatsapp.types";
import { StubWhatsAppProvider } from "./providers/stub.provider";

// Add real providers here as they're implemented (Twilio, Meta Cloud API, Gupshup, ...).
// Each is a self-contained file implementing IWhatsAppProvider; nothing outside
// this factory needs to change to add one.
const providers: Record<string, () => IWhatsAppProvider> = {
  stub: () => new StubWhatsAppProvider(),
};

export function getActiveProvider(): IWhatsAppProvider {
  const key = getSetting("whatsapp_provider") || "stub";
  const factory = providers[key] ?? providers.stub;
  return factory();
}
