import Foundation
import Capacitor
import RecaptchaEnterprise

/**
 * Capacitor bridge for Google reCAPTCHA Enterprise iOS SDK.
 * Public site key only — never embed service-account / API secrets.
 */
@objc(KaifyRecaptchaEnterprisePlugin)
public class KaifyRecaptchaEnterprisePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KaifyRecaptchaEnterprisePlugin"
    public let jsName = "KaifyRecaptchaEnterprise"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "execute", returnType: CAPPluginReturnPromise)
    ]

    private var client: RecaptchaClient?
    private var clientSiteKey: String?

    @objc func execute(_ call: CAPPluginCall) {
        guard let siteKey = call.getString("siteKey")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !siteKey.isEmpty else {
            call.reject("missing_site_key", "iOS reCAPTCHA site key is missing.", nil)
            return
        }

        guard let action = call.getString("action")?.trimmingCharacters(in: .whitespacesAndNewlines),
              !action.isEmpty else {
            call.reject("missing_action", "reCAPTCHA action is required.", nil)
            return
        }

        let timeoutMs = call.getDouble("timeoutMs") ?? 10_000
        let timeoutSeconds = max(1.0, timeoutMs / 1000.0)

        Task {
            do {
                if self.client == nil || self.clientSiteKey != siteKey {
                    self.client = try await Recaptcha.fetchClient(withSiteKey: siteKey)
                    self.clientSiteKey = siteKey
                }

                guard let client = self.client else {
                    call.reject("client_unavailable", "Secure sign-in is temporarily unavailable. Please try again.", nil)
                    return
                }

                let token = try await client.execute(
                    withAction: RecaptchaAction(customAction: action),
                    withTimeout: timeoutSeconds
                )

                call.resolve([
                    "token": token,
                    "action": action
                ])
            } catch let error as RecaptchaError {
                let message = Self.userMessage(for: error)
                call.reject("recaptcha_error", message, [
                    "code": error.errorCode.rawValue
                ])
            } catch {
                call.reject(
                    "network_error",
                    "Could not reach security verification. Check your connection and try again.",
                    nil
                )
            }
        }
    }

    private static func userMessage(for error: RecaptchaError) -> String {
        let raw = (error.errorMessage ?? "").lowercased()
        if raw.contains("timeout") || raw.contains("timed out") {
            return "Security verification timed out. Please try again."
        }
        if raw.contains("network") || raw.contains("offline") || raw.contains("connection") {
            return "Could not reach security verification. Check your connection and try again."
        }
        return "Security verification failed. Please try again."
    }
}
