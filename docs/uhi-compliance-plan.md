# UHI compliance plan: SanoVault as an End User Application (EUA)

Research date: 13 November 2026. Findings only; no code has been changed. Re-verify with NHA before committing budget, because several source documents are dated (see "Not verified").

## Summary

SanoVault would join the ABDM Unified Health Interface as an **EUA**, the patient-facing side. It cannot be an HSPA, which is provider-side software.

UHI is a discovery, booking and consultation network. It does not exchange health records. SanoVault today is a records folder, so becoming an EUA is a new product module rather than a compliance patch.

## Path to production

Source: [Join UHI](https://abdm.gov.in/uhi/join-uhi) and the [UHI Starter Guide](https://sandboxcms.abdm.gov.in/uploads/Unified_Health_Interface_Starter_Guide_v_F_21acedb49c.pdf) (dated 21 Dec 2023).

1. Register for the sandbox and receive credentials.
2. Generate an Ed25519 key pair and share the public key with ABDM.
3. Implement the UHI APIs and test with Postman.
4. Meet the catalog and schema standards.
5. Test against NHA's reference HSPA app.
6. Self-certify to receive production keys.

EUA self-certification bar (official checklist):
- Each test case executed successfully at least 5 times.
- Each EUA tested with at least 2 HSPAs.
- 95% success rate over the last 20 end-to-end transactions.

## What an EUA must build

| Area | Requirement | SanoVault today |
|---|---|---|
| ABHA (M1) | ABHA creation, verification and login are mandatory in the EUA checklist. Login by mobile OTP, email OTP and ABHA address; handle several ABHAs on one number. | Free-text `abha_number` on `patients`. Auth is Neon Auth (email, Google, Apple). |
| Signing | Ed25519 keys (DER; SPKI public, PKCS8 private). BLAKE2b-512 digest of the body. Header `{"headers":"(created) (expires) digest", ... "keyId":"{subscriber_id}\|{pub_key_id}\|ed25519"}`. Verify the gateway (`X-Gateway-Authorization`) and HSPA (`Authorization`) on inbound calls; return NACK with `UHI-1405` on failure. `expires - created` equals the request TTL. | Nothing. |
| Subscriber identity | Registered domain with a valid SSL certificate; `consumer_uri` must share the `consumer_id` domain. Public key registered with the network registry; look up counterparties via `/api/v1/networkregistry/lookup`. | Not set up. |
| Callbacks (inbound) | `on_search`, `on_select`, `on_init`, `on_confirm`, `on_status`, `on_update`, `on_message`, `on_cancel`. | None. |
| Calls (outbound) | `search` via gateway (`/api/v1/uhi/search`), then peer-to-peer `search`, `select`, `init`, `confirm`, `status`, `cancel`, `on_update`, `on_message`. | None. |
| Booking flow | Search by doctor, hospital, speciality, HPR ID; sort; show slots; billing address (from ABHA or new); price and cancellation terms; render the HSPA payment page and pass a redirect URL in `/init`; appointment history; cancel and reschedule; completion status and feedback form; book again. | None. |
| Chat | Text, camera photo, gallery, PDF. Only PDF, JPG, JPEG, PNG accepted; at most 5 MB; timestamps; preview. | None. |
| Video | Open the HSPA's join link; camera, speaker, mute, disconnect; screen must not auto-lock. | None. |
| App features | Hindi language switch; biometric screen lock; logout. | No localisation or biometrics in the mobile app. |
| Catalog standards | ISO 639-2 languages; MDDS speciality codes; STD city codes; ISO 6709 GPS; fulfilment types (PHYSICAL, ONLINE); payment types and statuses; order states; teleconsult statuses (`CONSULT_STARTED`, `DOCTOR_WAITING`, `DOCTOR_LATE`, `DOCTOR_NOT_JOINING`, `CONSULT_COMPLETED`, `PATIENT_NOT_JOINED`). | None. |

Payment happens on the HSPA's payment gateway, so the EUA does not handle card data.

## Reusable SanoVault assets

- `lib/security/file-signature.ts` for validating chat attachments.
- `lib/security/rate-limit.ts` and `lib/security/secret-box.ts` for throttling and encrypting stored keys.
- The doctor packet PDF, as an attachment to a consultation chat.
- The mobile offline cache and push device registration endpoint, for appointment status updates.

## Privacy, hosting and security gaps

Source: ABDM [Health Data Management Policy](https://abdm.gov.in/strapicms/uploads/health_management_policy_bac9429a79.pdf). It requires a documented information-security programme and ISO/IEC 27001, an annual independent audit, a data protection impact assessment, a published grievance officer, a published breach procedure, and consent that is free, informed and specific. Children's data needs guardian consent.

- Hosting is Vercel `iad1` and Neon `us-east-2`. The privacy policy says "SanoVault does not promise India-only storage". No explicit localisation clause was found in the policy; confirm with NHA.
- Groq AI processing is on by default and may process data outside India. Review against "specific" consent.
- `lib/services/audit.service.ts` records create, update and delete for four entity types. It does not record reads.

## Traps in the source material

- The reference `crypto.js` in the NHA repo hashes the signing string again before signing. The signing document says to sign the string directly. Cross-check against NHA's Java header generator.
- Domain codes differ across documents (`nic2004:85111`, `nic2008:86201`, NIC 86201). Follow the sandbox examples.
- The GitHub spec is at 0.0.1 and `core_version` 0.7.1; the live gateway Swagger is at v2.0.2.
- Node's built-in `crypto` should support both Ed25519 and `blake2b512`. Verify against NHA's header generator output.

## Suggested order of work

1. Confirm the current process, fees and security-audit scope with NHA (abdm@nha.gov.in, integration.support@nha.gov.in).
2. Apply for the sandbox; set up a dedicated subdomain for UHI callbacks.
3. Build the signing library and registry lookup; verify against the NHA header generator.
4. Implement ABHA M1 (creation, verification, login).
5. Build search, catalog rendering, booking, payment redirect, status and cancel.
6. Add chat, video handoff, Hindi, biometric lock, history and feedback.
7. Test against the NHA reference HSPA, then at least two further HSPAs, and self-certify.
8. Address privacy, hosting and audit gaps in parallel, starting before step 4.

## Decisions needed

1. Whether SanoVault should become a booking and consultation app.
2. Whether to move hosting to India.
3. Whether to accept ABHA creation and Aadhaar flows, and the audit load that comes with them.

## Not verified

- The sandbox registration link (`/sandbox/v3/sandbox-registration`) returned a 404.
- The Starter Guide is from December 2023; the process may have changed.
- Whether ABDM's M1 functional testing and WASA security audit apply to UHI production. Third-party guides say they apply to ABDM production access.
- Fees and timelines.
- The registry registration fields come from a 2022 draft FRS: legal name, GSTN, address, website, admin contact, callback URL, signing key, encryption key. The live form may differ.

## Sources

- [UHI sandbox documentation](https://sandbox.abdm.gov.in/sandbox/v3/new-documentation?doc=UHI)
- [Join UHI](https://abdm.gov.in/uhi/join-uhi)
- [NHA-ABDM/UHI repository](https://github.com/NHA-ABDM/UHI) (spec, signing document, header generator, draft gateway FRS)
- [UHI gateway Swagger](https://uhigatewaysandbox.abdm.gov.in/swagger-ui/index.html?urls.primaryName=v1.0.5), versions up to v2.0.2
- [Catalog Mandatory Requirements](https://docs.google.com/spreadsheets/d/14HSsyn1tNaxmXO4y21a4OiXaEID5FbeVLWJXX52OX3E/edit), [EUA self-certification checklist](https://docs.google.com/spreadsheets/u/0/d/1WwwzyAwxhw-Ng0QOzFmrfh5hvlXpNrciVzTBmSsz9DE/edit), [HSPA checklist](https://docs.google.com/spreadsheets/u/0/d/1JwQFuL3wp2hNMjDu8BSeOyU9ndnv6cJrDSdyBSImoN0/edit)
- [ABDM Health Data Management Policy](https://abdm.gov.in/strapicms/uploads/health_management_policy_bac9429a79.pdf)
- [Third-party certification guide](https://nirmitee.io/blog/abdm-certification-process-sandbox-to-production-guide/) (secondhand; verify with NHA)
