One Sentence Description (max 280 characters)
HealthProof is a Layer 1–based Web3 verification layer that enables medical centers and laboratories to issue, verify, and exchange tamper-proof medical orders and test results through smart contracts, while patients retain full control over access and permissions.

What problem are you addressing?
Digital healthcare still operates on fragile, non-verifiable documents. At the same time, healthcare data is fragmented across institutions. Medical centers and laboratories rarely interoperate, forcing patients to manually transport documents between providers.
Unverifiable documents + fragmented systems = systemic clinical and regulatory risk.

Who experiences this problem?
In Chile, the Interoperability Law was passed in 2024, and the Data Protection Law is expected to come into effect in December 2026. We support both laws with a B2B model to enable medical centers and laboratories to interoperate, empowering patients with data protection rights and ensuring the safekeeping of their medical orders and test results.
HealthProof enables institutions to interoperate while empowering patients with cryptographic access control.

How is the problem currently solved (if at all)?
Today’s process is manual and trust-based. Patients visit a doctor who issues a prescription. Then goes to the laboratory where the paper prescription is valid for the lab to perform the tests. Once they have the paper results (in some cases, via email), they return to their doctor.
In public healthcare systems, centralized internal platforms manage records. However, these systems are closed environments that keep patients dependent on the institution that stores their records and don’t interoperate across institutions
Current solutions store data — but they do not prove truth.

What solution do you propose?
HealthProof introduces a Web3 verification layer built on Layer 1 infrastructure to guarantee:
Authenticity (cryptographic proof)


Integrity (tamper-resistance)


Traceability (timestamped lifecycle)


Patient-controlled permissions


MVP Workflow
A patient visits a medical center.


The medical center generates a medical test order (JSON file stored in its internal database).


A cryptographic hash of the document is registered on-chain.


Both the patient and the laboratory can request access to read the document.


The patient approves access (e.g., via QR code or one-click authorization).


The laboratory updates the exam status (performed / results generated).


The patient is notified and returns to the medical center.


The doctor interprets the results and may issue a new order or prescription, repeating the cycle.


Permission Model (Patient-Managed)
There are three core permissions:
Authorization for the medical center to issue a test order.


Authorization for the laboratory to access and upload results.


Authorization for the doctor to review and interpret results.


The patient does not share data — the patient shares permissions.
Architecture Principles
Sensitive medical data remains off-chain.


Only cryptographic proofs (hash + timestamp + references) are stored on-chain.


Designed to run on Layer 1, ensuring compliance with jurisdictional data sovereignty requirements (data cannot leave the country of origin).


Fully compatible with existing healthcare systems (we complement EHRs; we do not replace them).


HealthProof resolves interoperability structurally — not only by complying with regulation, but by embedding verification into the architecture itself.

What triggers an on-chain transaction in your project?
On-chain transactions occur when:
A medical test order is issued
 → The document hash and metadata reference are registered on-chain.


A laboratory associates results with an existing order
 → A new state update is recorded and linked to the original order.


A patient grants or revokes access permissions
 → Smart contract state reflects authorization changes.


A follow-up order or prescription is issued
 → A new verifiable record is created within the same lifecycle.


Each on-chain action represents a verifiable state transition in the medical document lifecycle, creating an auditable, tamper-proof chain of trust.


