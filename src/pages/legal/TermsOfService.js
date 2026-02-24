import { Link } from "react-router-dom";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Last updated: February 24, 2026
          </p>

          <div className="mt-6 space-y-6 text-sm leading-7 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Service Overview</h2>
              <p>
                Mockzam is an exam-preparation platform that provides mock tests, practice mode,
                custom tests, analytics, leaderboard features, bookmarking, error reporting, and
                AI-assisted study explanations and chat support.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Acceptance and Eligibility</h2>
              <p>
                By using Mockzam, you agree to these terms. You must use a valid Google account
                and comply with applicable laws and exam integrity rules.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Accounts and Access</h2>
              <p>
                Authentication is handled through Google Sign-In (Firebase Authentication). You are
                responsible for maintaining the security of your account and any activity under it.
                We may suspend access for misuse, abuse, or security reasons.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>attempt unauthorized access to users, admin tools, or infrastructure;</li>
                <li>abuse, overload, scrape, or reverse engineer the platform;</li>
                <li>submit harmful, illegal, or abusive content via chat/reporting fields;</li>
                <li>bypass anti-cheat or exam controls during test sessions.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Test Integrity and Anti-Cheat</h2>
              <p>
                Mock tests may enforce fullscreen mode and other anti-cheat controls. Exiting
                required exam states can trigger warnings or automatic submission. These controls
                are part of the core test simulation experience.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. AI Features</h2>
              <p>
                AI features are provided for educational support only. Responses may be incomplete
                or incorrect and should not be treated as official exam authority. Do not share
                sensitive personal information in AI prompts.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Content and Intellectual Property</h2>
              <p>
                The platform design, code, branding, and original content remain protected by
                applicable intellectual property law. You retain rights to content you submit, but
                you grant permission to process and store it to operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">8. Availability and Changes</h2>
              <p>
                We may modify features, limits, or integrations (including AI providers) at any
                time to improve reliability, security, or quality.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">9. Disclaimer and Limitation</h2>
              <p>
                Mockzam is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent
                permitted by law, we disclaim warranties and are not liable for indirect, incidental,
                special, or consequential damages arising from use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">10. Termination</h2>
              <p>
                We may restrict or terminate access for violation of these terms, abuse of platform
                resources, security threats, or misuse of admin/AI features.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">11. Contact</h2>
              <p>
                For legal or policy questions, open an issue in the project repository:
                {" "}
                <a
                  className="underline"
                  href="https://github.com/amanrcy1/MockTest-app/issues"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/amanrcy1/MockTest-app/issues
                </a>
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-sm">
            <Link to="/privacy" className="text-blue-600 dark:text-blue-400 underline">
              Privacy Policy
            </Link>
            <Link to="/login" className="text-blue-600 dark:text-blue-400 underline">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
