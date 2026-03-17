import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: March 17, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Account information:</strong> When you sign up, we collect your email address, username, and optional profile details (display name, bio, avatar).
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Content:</strong> Photos, videos, comments, and messages you create or share on Viewza.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Usage data:</strong> How you interact with the App, including pages visited and features used.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Device information:</strong> Browser type, operating system, and device identifiers for push notifications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <ul className="text-sm space-y-1.5 text-muted-foreground list-disc pl-5">
              <li>Provide, maintain, and improve the App</li>
              <li>Personalize your experience and show relevant content</li>
              <li>Send notifications about activity on your account</li>
              <li>Enforce our Terms of Service and protect users</li>
              <li>Communicate important updates about the service</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How We Share Your Information</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We do not sell your personal data. Your public profile, posts, and interactions are visible to other users as part of the social experience. We may share data with service providers who help operate the App (e.g., hosting, analytics) under strict confidentiality agreements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. End-to-End Encryption</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Direct messages on Viewza support end-to-end encryption. When enabled, message content is encrypted on your device and can only be read by you and the recipient. We cannot access encrypted message content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Data Storage & Security</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your data is stored securely using industry-standard practices including encryption at rest and in transit, row-level security policies, and regular security audits. We retain your data for as long as your account is active.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
            <ul className="text-sm space-y-1.5 text-muted-foreground list-disc pl-5">
              <li><strong className="text-foreground">Access:</strong> You can view and download your data through Settings</li>
              <li><strong className="text-foreground">Correction:</strong> You can edit your profile and content at any time</li>
              <li><strong className="text-foreground">Deletion:</strong> You can delete your account, which removes your data</li>
              <li><strong className="text-foreground">Portability:</strong> You can request a copy of your data</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Cookies & Local Storage</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use local storage and session tokens to keep you signed in and store your preferences. We do not use third-party advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Push Notifications</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              If you enable push notifications, we store your device's push subscription securely to deliver notifications. You can disable push notifications at any time through your device or browser settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Viewza is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update this Privacy Policy periodically. We will notify you of significant changes through the App or via email. Continued use constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For privacy-related questions or requests, contact us at hello@viewza.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
