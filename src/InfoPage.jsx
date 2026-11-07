import React from "react";

export default function InfoPage({ page, onBack }) {
  const privacy = page === "privacy";
  return (
    <section className="panel info-page">
      {onBack && (
        <button className="button ghost" onClick={onBack}>
          ← Back to LLAMA
        </button>
      )}
      <h1>{privacy ? "Privacy policy" : "Frequently asked questions"}</h1>
      {privacy ? (
        <>
          <p>
            Last updated: 7 November 2026. This notice describes the features
            implemented in LLAMA. It is not a claim of legal certification.
          </p>
          <h2>Accounts and household information</h2>
          <p>
            LLAMA stores your name, email, optional username, password hash and
            login sessions through Better Auth in the app's Neon PostgreSQL database.
            Household names, memberships, invitations, saved lists, preferences
            and reminders are stored there too. Your password is not shared with
            your family anchor.
          </p>
          <h2>Who can see household data?</h2>
          <p>
            Current members can read and edit saved household lists and
            reminders. The family anchor manages invitations, removes members,
            transfers the anchor role and deletes the household. Each member
            uses their own account. Do not include bank credentials, medical
            records or other sensitive information in lists or prompts.
          </p>
          <h2>AI suggestions</h2>
          <p>
            When you request an AI suggestion, the prompt and household context
            included by the app are sent through the server to the configured AI
            provider (currently Meta and/or Google). Their processing is
            governed by their own policies. LLAMA generates proposals, not
            verified bookings, purchases or payments.
          </p>
          <h2>Notifications and devices</h2>
          <p>
            Push is opt-in per browser/device. Subscription endpoints and
            encryption keys are stored to send generic household updates and
            reminder alerts through your browser's push provider. Lock-screen
            messages do not include names, bill amounts or reminder labels. Turn
            notifications off in Settings to remove this device's server
            subscription; browser permission is managed separately in your
            browser.
          </p>
          <h2>Cookies and local data</h2>
          <p>
            Login uses session cookies. Guest data stays in memory for the
            current visit and is not uploaded automatically. Earlier app
            versions may have saved account data in this browser; account
            deletion clears the known account-specific keys on this device, but
            cannot erase storage on other devices. Shared changes upload only
            when you choose Save household changes.
          </p>
          <h2>Retention and deletion</h2>
          <p>
            Account deletion removes your account, sessions, membership and push
            subscriptions. Shared household content remains for other members;
            remove personal content and save before leaving if needed. Anchors
            must transfer their role or explicitly delete the household first.
            Household deletion removes its shared data, invitations and
            reminders, but does not delete other members' personal accounts.
            Invitations expire after 24 hours. Reminder and delivery records are
            cleaned after seven days when the push worker runs. Infrastructure
            logs and database backups may follow their providers' retention
            policies; deleting an account is not a promise of immediate erasure
            from backups.
          </p>
          <h2>Privacy questions</h2>
          <p>
            Contact the app operator through the person who provided your LLAMA
            access. Before a public launch, the operator must provide a direct
            privacy contact and confirm retention, provider agreements and
            applicable legal requirements.
          </p>
        </>
      ) : (
        <>
          {[
            [
              "How do I join my family?",
              "Ask your family anchor for your assigned username and one-use invitation code. Create your own account using that username, your email and a password only you know, then enter the code in Settings. Existing users can set an available username in Settings before joining. Invitations expire in 24 hours.",
            ],
            [
              "What can the family anchor do?",
              "The person who creates the household becomes its anchor. They can invite and remove members, transfer the role to a current member or delete the shared household. They cannot read your password. Usernames are unique across LLAMA; if one is taken, ask the anchor for a new invitation with a different username.",
            ],
            [
              "Are my lists shared automatically?",
              "No. Use Save household changes to publish your current lists and preferences to your household. Refresh shared data loads the latest saved version and replaces your unsaved edits. If someone has saved a newer version, your save is rejected rather than silently overwriting it. Guest data is never uploaded automatically.",
            ],
            [
              "Which notifications will I receive?",
              "Once you opt in on a device, LLAMA can send household-save alerts plus bill and activity reminders created in Settings. Dates in existing lists do not automatically create reminders. Times are entered in your device's local time and stored in UTC. Delivery is best-effort, may be delayed or duplicated, and is not suitable for emergencies.",
            ],
            [
              "Why are notifications unavailable?",
              "The app operator must finish database, push-key and scheduled-worker setup. Your browser must support Web Push and you must grant permission. On iPhone/iPad, install LLAMA to the Home Screen on a supported OS and launch it there. Browser or operating-system settings may still block delivery.",
            ],
            [
              "What happens when I log out or delete my account?",
              "Logging out disables notifications on this device and ends this browser's session. Deleting your account is permanent and also removes its membership and server subscriptions. Shared content stays for remaining members. An anchor must transfer the role or delete the household first. Other members' accounts are not deleted.",
            ],
            [
              "Does LLAMA make bookings or payments?",
              "No. AI output is a suggestion only. Check prices, availability, dates and totals yourself. LLAMA does not execute purchases, payments, calendar bookings or emergency reminders.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
