# FIRS Merchant Buyer Solution: production credentials follow-up

## Internal context

We started FIRS Merchant Buyer Solution onboarding earlier this year and have been working through the documentation and sandbox access. We need production credentials and clarity on a handful of API specifics to ship the automatic VAT filing piece of our Tax+ tier (see `docs/tax-plus-tier.md`). Until production credentials land, Tax+ users get the manual-upload version: we generate a FIRS-format VAT return PDF and CSV, the seller uploads to the FIRS portal, and they confirm filing inside CashTraka. That ships now. The fully automated path needs FIRS to close out the items below.

## Open questions for FIRS

1. What is the production base URL for the e-invoicing API, and how does it differ from the sandbox endpoint we currently have?
2. What is the issuance process for production credentials once our sandbox testing is signed off, and who on the FIRS side owns that handoff?
3. What is the exact IRN (Invoice Reference Number) format we should generate and submit, and is there a checksum or check-digit specification we should validate against before submission?
4. What is the expected QR code payload spec on the stamped invoice: the IRN alone, a signed JWT, or a structured URL pointing back to FIRS verification?
5. What is the rejection retry policy: are rejections final, or can we resubmit a corrected invoice under the same IRN, and what is the time window?
6. Is VAT returns submission part of the Merchant Buyer Solution API, or is it a separate FIRS service we need to onboard to in parallel?

## Draft email

**To:** [FIRS contact name], [contact email]
**Subject:** CashTraka MBS onboarding: production credentials and a few open questions

Good day [contact name],

Hope you are well. Following on from our earlier exchanges on the Merchant Buyer Solution onboarding, we are ready to move toward production for CashTraka and would like to lock down the remaining items.

We have completed sandbox testing on the e-invoicing endpoints we have access to, and we are about to launch a Tax+ tier for VAT-registered Nigerian SMBs. Automatic VAT filing through MBS is one of the features we have committed to those customers, and we want to make sure we get the integration right rather than guess at the spec.

Could we get your help on the following, either by email or on a 30-minute call at your convenience?

1. The production base URL and the steps to issue production credentials once you confirm we have completed onboarding.
2. The exact IRN format to generate, including any checksum requirements.
3. The QR code payload spec for stamped invoices.
4. The rejection and retry policy for submitted invoices.
5. Whether VAT returns submission is part of MBS or a separate FIRS service we should onboard to in parallel.

If a call is easier, we are open Monday to Friday 09:00 to 17:00 WAT for the next two weeks. Send any time slot that works for you and we will confirm the same day.

Thank you for your help so far. We want to be a reliable channel for FIRS-compliant invoicing among Nigerian SMBs, and getting these last items closed out is what stands between us and shipping that to paying customers.

Kind regards,
[Founder name]
Founder, CashTraka
[founder email]
[phone]
