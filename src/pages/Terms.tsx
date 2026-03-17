import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: March 17, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              By accessing or using Viewza ("the App"), you agree to be bound by these Terms of Service. If you do not agree, do not use the App.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Eligibility</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You must be at least 13 years old to use Viewza. By using the App, you represent that you meet this requirement. If you are under 18, you must have parental or guardian consent.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use. You may not create accounts through automated means or use another person's account without permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. User Content</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You retain ownership of content you post. By posting content, you grant Viewza a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content within the App. You are solely responsible for the content you post and must not upload illegal, harmful, or infringing material.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Prohibited Conduct</h2>
            <ul className="text-sm space-y-1.5 text-muted-foreground list-disc pl-5">
              <li>Harassment, bullying, or threatening other users</li>
              <li>Posting hateful, violent, or sexually explicit content</li>
              <li>Impersonating others or creating misleading accounts</li>
              <li>Spamming, phishing, or distributing malware</li>
              <li>Attempting to access other users' accounts or data</li>
              <li>Using bots or automated tools without authorization</li>
              <li>Violating any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Intellectual Property</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The Viewza name, logo, design, and all related intellectual property are owned by Viewza. You may not copy, modify, or distribute any part of the App without written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Termination</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may suspend or terminate your account at any time for violating these Terms or for any reason at our discretion. You may delete your account at any time through Settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Disclaimers</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The App is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. We are not liable for any content posted by users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To the maximum extent permitted by law, Viewza shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to Terms</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We may update these Terms at any time. Continued use of the App after changes constitutes acceptance of the new Terms. We will notify users of significant changes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              For questions about these Terms, contact us at hello@viewza.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
