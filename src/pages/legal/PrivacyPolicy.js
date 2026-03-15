import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Last updated: February 24, 2026
          </p>

          <div className="mt-6 space-y-6 text-sm leading-7 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Scope</h2>
              <p>
                This policy explains how Mockzam collects, uses, stores, and protects your data when
                you use the web app and its related AI features.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                2. Data We Collect
              </h2>
              <p>Based on current app behavior, we process the following categories:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Account data</strong>: Firebase UID, name, email, and optional profile
                  photo from Google Sign-In.
                </li>
                <li>
                  <strong>Profile data</strong>: target exam, onboarding status, login metadata, and
                  admin flag where applicable.
                </li>
                <li>
                  <strong>Test data</strong>: exam type, selected answers, timings, marks, accuracy,
                  completion status, and derived analytics.
                </li>
                <li>
                  <strong>User-generated data</strong>: bookmarks, notes, and question error
                  reports.
                </li>
                <li>
                  <strong>Admin operation data</strong>: audit log entries for admin actions.
                </li>
                <li>
                  <strong>AI interaction data</strong>: chat messages, limited conversation history,
                  question/explanation context, and performance context used to improve AI
                  responses.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                3. Browser Storage
              </h2>
              <p>
                The app uses local and session storage for UX and reliability, including theme
                preference, active test session recovery, install banner state, cached question
                counts, and cached AI chat stats.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                4. How We Use Data
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>authenticate users and maintain account access;</li>
                <li>deliver test-taking features, scoring, and results;</li>
                <li>show leaderboards and performance insights;</li>
                <li>support bookmarking, reporting, and admin moderation workflows;</li>
                <li>provide AI explanations and chat responses via secure server endpoints;</li>
                <li>improve stability, abuse prevention, and security operations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                5. Third-Party Services
              </h2>
              <p>Mockzam integrates with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Firebase (Authentication, Firestore, Storage, App Check);</li>
                <li>Vercel serverless APIs for AI features;</li>
                <li>Groq-hosted language models for AI chat and explanation generation.</li>
              </ul>
              <p>
                AI requests are sent through server-side endpoints. Your browser does not receive
                the Groq API key.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                6. Data Sharing
              </h2>
              <p>
                We do not sell your personal data. Data is shared only with service providers needed
                to run the platform (for example Firebase/Vercel/Groq) and as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                7. Security Controls
              </h2>
              <p>
                Current controls include authenticated API access, Firestore security rules, rate
                limiting for AI endpoints, payload validation, anti-cheat safeguards, and optional
                App Check in production.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">8. Retention</h2>
              <p>
                Data is retained while needed to provide service functionality, analytics history,
                moderation, and security records. Session cache data in browser storage may be
                short-lived and automatically overwritten or removed.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                9. Your Choices
              </h2>
              <p>
                You can stop using the app at any time, clear browser storage locally, and request
                account/data deletion through the project maintainers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                10. Children&apos;s Privacy
              </h2>
              <p>
                Mockzam is intended for exam aspirants and is not directed to children under 13. If
                you believe a child has submitted personal data, contact the maintainers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                11. Policy Updates
              </h2>
              <p>
                We may update this policy as features or integrations change. The date at the top
                shows the latest revision.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">12. Contact</h2>
              <p>
                For privacy questions or deletion requests, open an issue:{' '}
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
            <Link to="/terms" className="text-blue-600 dark:text-blue-400 underline">
              Terms of Service
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

export default PrivacyPolicy;
