# One Home — Internal Technical Audit & Validation Report

**Project:** One Home / Dood Labs  
**Report date:** October 6, 2026 (Arizona)  
**Report version:** 1.0  
**Assessment type:** Limited internal technical review and validation summary  
**Public application:** https://doodlabs.app  
**Public source:** https://github.com/Dood-Labs-One-Home/One-Home

> This is an internal, AI-assisted review of selected public source, existing automated checks, and historical team validation records. It is not an independent third-party security audit, penetration test, complete smart-contract audit, or certification that all One Home features are secure or production-ready. It may be supplied as internal technical validation evidence; the application reviewer determines whether it satisfies its audit requirement.

## 1. Result and scope

Fourteen selected existing automated checks passed on October 6, 2026 against the public OH-276 application snapshot. These checks cover Avalanche network configuration, selected mocked booking-admin authorization behavior, and mint-share input/output handling.

Historical team records also document completed XRPL, Ethereum Sepolia, Base Sepolia, Polygon Amoy, Stellar Testnet, and Avalanche Fuji minting or ownership-display milestones. These historical outcomes were not repeated or independently reconciled to blockchain transactions during this review.

The result supports a limited statement: the tested source behaviors passed, and the reviewed records document prior functional milestones. It does not establish a complete current-production regression pass or a security sign-off for all supported networks.

Included:

- Public repository identity, branch, and application snapshot.
- Existing Avalanche configuration tests.
- Selected existing mocked admin and mint-share tests.
- Historical Passport, wallet, mint, receipt, ownership, and release records.
- Documented limitations and work requiring further verification.

Not performed:

- Live wallet signing, contract deployment, minting, payments, or payouts.
- A fresh authenticated browser/session or iPhone Safari acceptance run.
- A complete application build, dependency scan, or all repository test suites.
- Full backend, database permissions, storage-policy, or smart-contract review.
- Independent verification of transaction volume, revenue, DAU, TVL, or user counts.

## 2. Exact source and release boundaries

| Item | Evidence and boundary |
| --- | --- |
| Repository | Public `Dood-Labs-One-Home/One-Home`; default branch `main`. |
| Application snapshot assessed | Commit `3ce2e12c882d9f85da2cf47ba780e3070352d228`, dated September 28, 2026; commit message identifies the merged OH-276 public source snapshot. |
| Primary app location | `apps/one-home/`; selected test sources under `scripts/oh276/`. |
| Production URL | `https://doodlabs.app`; the current deployed version was not independently established in this review. |
| OH-267 / v14.67.267 | Separate Foundation Build 1 candidate. Its recorded checks are historical and do not certify OH-276. Its frontend promotion to production is not established here. |
| OH-277 | A later internal deployment-preflight record identifies this as its last known-good production authority. That historical record is not a current October 6 deployment verification. |
| OH-280 | Later Avalanche/Core work is represented by a separate static release artifact and team feedback. It was not the public source assessed in this report. |

Application behavior must be tied to an exact source commit, backend revision, and deployed release before using this report for a later release. Versioned filenames and an older release-verification JSON are not evidence of the current production version.

## 3. Architecture represented by the evidence

One Home connects Passport identity, profiles, linked wallets, creator minting, public mint access, NFT ownership display, games, and related experiences.

The reviewed internal records identify the Passport/authenticated user ID as the canonical account identity. Wallets are linked transaction and ownership tools rather than substitutes for that identity. Historical records describe wallet ownership proof and Passport-owned creator drafts, campaigns, and return destinations.

The public application contains chain-specific wallet interfaces, a shared chain identity resolver, creator and collector mint interfaces, and My NFTs display code. The canonical chain resolver separates a blockchain's identity from its mainnet/testnet environment.

The public mint-share function calls public backend RPCs for mint metadata and links. Their live permissions and visibility enforcement remain backend responsibilities; they were not audited in this review.

Foundation Build 1 separately proposed an Experience Registry, bounded Home Context, and standard launch/return adapters. Its checkpoint preserves existing Destination Registry and handoff authorities. That candidate's tests are described in section 6 and are not evidence that every connected experience is currently deployed.

Sources: [chain identity resolver](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/apps/one-home/shared/onehome-chain-identity-v1467114.js), [architecture notes](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/architecture.md), [mint-share source review](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/oh276-mint-share.md).

## 4. Network validation evidence

“Team-recorded” below means a reviewed internal status record or demonstration describes the outcome. It is separate from the source checks rerun for this report.

| Network | Recorded outcome | Evidence date / scope | Limitation |
| --- | --- | --- | --- |
| XRP Ledger | Team-recorded creator/buyer minting on Mainnet and Testnet; Xaman/Crossmark routes, receiving wallets, multi-mint, receipts, permanent links, and My NFTs. Later checklist records Joey ownership proof, linking, minting, and My NFTs validation. | August 24 master status; September 5 checklist. | No new live transaction or explorer reconciliation performed here. |
| Ethereum | Team-recorded creator/mint and My NFTs success on Sepolia through MetaMask. | August 24 status; September 5 checklist. | Does not establish an Ethereum Mainnet acceptance pass. |
| Base | Team-recorded Sepolia mints, quantities/limits, Open Mints, and My NFTs. | August 24 status; September 5 checklist. | Mainnet configuration or activation is not proof of a completed mainnet transaction. |
| Polygon | Team-recorded successful Amoy mint after gas-policy correction, sold-out behavior, notification, and public/X entry. | August 24 status; September 5 checklist. | Does not establish a Polygon Mainnet acceptance pass. |
| Stellar | Team-recorded Freighter Testnet mint, multiple linked wallets, and My NFTs/cover repairs. | September 5 checklist. | No new live verification; LOBSTR-specific equivalence and mainnet acceptance are not established here. |
| Avalanche | September 27 demonstration deck records a Fuji ERC-721 creator-to-collector flow, receipt/Token ID, and My NFTs display. Five public-source configuration tests passed again on October 6. | September 27 demo; OH-276 source; October 6 automated checks. | Public OH-276 readiness notes keep mainnet minting/payments/payouts disabled. Later Core X/P work and mainnet mint acceptance are outside the tested snapshot. |
| BNB Smart Chain | Testnet/mainnet identifiers exist in the public chain resolver; historical integration progress is recorded. | OH-276 source and September 5 checklist. | This report does not certify a completed BNB creator-to-collector mint or BNB mainnet production acceptance. |
| Other integrations | Public resolver also lists Optimism, Arbitrum, Linea, Hedera, and Sei. Historical records mention later Solana, Cardano, and Midnight work. | Public source / historical checklist. | Registry entries, wallet linking, and development progress do not prove deployed contracts or completed mint flows. Detailed per-chain acceptance evidence was not recovered for this report. |

The dates above identify the records reviewed, not necessarily the date each transaction occurred. Absence of recovered evidence is not a finding that an integration was never built.

The public Avalanche notes explicitly distinguish Fuji C-Chain `43113` from mainnet C-Chain `43114`, with mainnet wallet linking represented separately from mint enablement. See [Avalanche Mainnet Readiness](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/avalanche-mainnet-readiness.md).

## 5. Automated checks rerun on October 6

**Runtime:** Node.js v24.19.0  
**Environment:** Local isolated source-review workspace; offline configuration and mocked behavior checks.  
**Source:** The pinned commit in section 2. The four Avalanche application inputs were verified byte-for-byte against their repository Git blob hashes before testing.

### Avalanche configuration — 5 passed, 0 failed

Command, from repository root:

```bash
node --test scripts/oh276/test-oh276-fuji.mjs
```

| Check | Result |
| --- | --- |
| Creator and collector use matching Fuji chain IDs, AVAX currency, and RPC configuration. | PASS |
| Passport wallet choices expose explicit Fuji selection and retain alphabetical ordering. | PASS |
| Mainnet wallet-link configuration remains separate from disabled minting. | PASS |
| Canonical chain identity distinguishes Fuji from mainnet. | PASS |
| Creator chain-family labeling preserves Avalanche and other family names. | PASS |

These checks inspect source/configuration. The mainnet-link check does not sign a wallet proof or confirm a live linked wallet.

### Selected admin and mint-share checks — 9 passed, 0 failed

Command, from repository root:

```bash
node --test --test-name-pattern='^(bookings page|booking admin|mint-share)' scripts/oh276/test-oh276-public-review.mjs
```

| Check | Result |
| --- | --- |
| Booking page contains no captured RUM script/token pattern and retains the reviewed authorization runtime hash. | PASS |
| Missing session produces no booking backend call. | PASS |
| Mocked server denial keeps private booking controls hidden. | PASS |
| Controls appear only after a mocked successful authorization response. | PASS |
| Booking runtime retains its production-origin guard. | PASS |
| Invalid mint-share ID returns 404 without a service call. | PASS |
| Mint-share escapes supplied metadata and pins its canonical host/public-slug route. | PASS |
| Mint-share fallback preserves Fuji routing and rejects the tested external redirect input. | PASS |
| Failed cover lookup returns a no-store 503. | PASS |

The existing public-review test file also contains dependency-hash and archive-worker tests. Those two tests were not selected or run for this review. The result is nine selected passing checks, not a pass of the entire test file or repository.

Booking tests use mocked sessions and backend responses. Mint-share tests use mocked RPC responses. Neither suite establishes live server authorization, public RPC visibility rules, deployed hosting compatibility, or exhaustive protection against attacks.

Test sources: [Fuji tests](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/scripts/oh276/test-oh276-fuji.mjs), [public-review tests](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/scripts/oh276/test-oh276-public-review.mjs). The associated [dependency-provenance file](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/oh276-dependency-provenance.json) is an inventory/hash record, not a third-party dependency security audit.

## 6. Historical validation and release evidence

Reviewed historical records include:

| Internal record | Documented result | Boundary |
| --- | --- | --- |
| `ONE-HOME-MASTER-STATUS-2026-08-24.md` | Completed Passport/account durability, mint matrix, navigation/return paths, and mobile functional QA at that checkpoint. | Historical team record; not a fresh current-release acceptance run. |
| `One-Home-Master-Checklist-2026-09-05.md` | Later wallet, Stellar, mobile MetaMask, mint, and EVM royalty milestones; also explicitly records unresolved evidence and later regressions. | A reconciliation register, not a complete transcript or independent audit. |
| `ONE_HOME_Team1_India_Speedrun_Final.pptx (2).pptx` | Fuji mint-success and ownership screenshots; creator-to-collector demo described. | Reviewed presentation evidence; full transaction hashes were not extracted and independently verified in this report. |
| `OH-267-CHECKPOINT.md` | Reports 20/20 Foundation Build 1 checks, JavaScript/TypeScript syntax checks, exact seven-file change boundary, protected-file preservation, and byte-identical rollback restoration. | Separate candidate; results were not rerun for this report. Checkpoint deferred authenticated live Home Context round-trip and recorded no frontend production publish. |
| `OH-267-DEPLOYMENT-PREFLIGHT.md` | Reports configuration/hash preservation, 4/4 baseline matches, and 3/3 new-path absence checks; identifies OH-277 rollback authority. | Later preparation record reports Home Context ACTIVE v1 / Verify JWT ON. This does not itself prove the candidate frontend was promoted or a live round-trip passed. |

These internal records were read in full for the relevant scope. They are not attached to the public repository by this report, so the historical outcomes should be treated as team-recorded evidence rather than independently reproducible public proof.

The older `scripts/oh276/release-verification.json` declares checks for version `14.67.241`. It is retained historical configuration and is not presented as a current hosting/header verification.

## 7. Security controls and practical limits

The passing tests provide evidence for specific controls:

- Selected admin UI behavior fails closed when there is no session or a mocked denial.
- Mint-share rejects malformed IDs before lookup, escapes tested metadata, and pins the tested canonical route.
- Source configuration distinguishes Avalanche wallet availability from mint authorization.
- Historical Foundation Build 1 checks test canonical JWT-derived identity and reject client-supplied identity/claim fields for that bounded context.

Authorization must still be enforced by the server. Hidden controls, a frontend origin check, chain labels, and successful mocked tests are not sufficient authorization boundaries.

The historical EVM v2 royalty record describes an ERC-2981/splitter design with platform, creator, and optional collaborator allocations. It is functional implementation evidence, not an independent review of contract access control, payout correctness, or all marketplace enforcement.

No conclusion is made here about complete production database grants/RLS, storage access, wallet challenge replay resistance, key custody, backend endpoint JWT settings, transaction idempotency, contract upgrade authority, or all public/private RPC boundaries.

## 8. Known limitations and verification items

| Area | State / next evidence needed |
| --- | --- |
| Current release mapping | Reconcile public source, backend revisions, static release artifacts, and the actual current production deployment before a full release audit. |
| Avalanche mainnet/Core | Recover exact deployed contract/network records and a controlled mint receipt plus ownership readback for the current release. C-Chain EVM success does not certify native X/P asset operations. |
| Other networks | Keep wallet-link, creator deployment, buyer mint, ownership display, and mainnet activation as separate acceptance milestones. |
| Passport/session/mobile | Preserve recorded successful baselines; rerun relevant login/logout, return-path, cross-device, and iPhone wallet checks when affected code changes. |
| Full application/experiences | Arcade, SHRUNK, WANDER, Duckyverse, Bowling Buddies, QR onboarding, and other rooms were not given a complete fresh runtime audit in this report. |
| Historical on-chain proof | Publish reviewed contract/explorer links and transaction hashes before presenting historical mint or revenue totals as independently verified. |
| Independent security assurance | No external audit report or auditor attestation was found in the reviewed materials. |

No new vulnerability severity rating is assigned by this limited review. Unverified areas are evidence gaps and review scope boundaries, not findings that every listed system is defective.

## 9. Independent audit scope still required

An independent assessment should identify the exact release/commit and cover:

1. Passport/session validation, server authorization, admin permissions, and database/storage access policies.
2. Wallet ownership challenges, signatures, expiry, single-use enforcement, and cross-chain identity boundaries.
3. Contract source, deployment addresses, mint permissions, supply/quantity limits, royalties, payout logic, and privileged operations.
4. Transaction confirmation, duplicate/replay prevention, receipt recovery, and ownership readback.
5. Dependencies, browser injection surfaces, secret handling, public endpoints, and hosting configuration.

Any audit should record reproducible findings, remediation status, retest outcomes, and exclusions. This internal report does not represent that those independent review steps have already happened.

## 10. Public evidence index

The following links are pinned to the application snapshot assessed:

- [Assessed application commit](https://github.com/Dood-Labs-One-Home/One-Home/commit/3ce2e12c882d9f85da2cf47ba780e3070352d228)
- [Avalanche mainnet readiness](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/avalanche-mainnet-readiness.md)
- [Canonical chain identity source](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/apps/one-home/shared/onehome-chain-identity-v1467114.js)
- [Fuji configuration tests](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/scripts/oh276/test-oh276-fuji.mjs)
- [Admin/mint-share mocked tests](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/scripts/oh276/test-oh276-public-review.mjs)
- [Mint-share implementation](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/netlify/functions/mint-share.js)
- [Mint-share source-review boundaries](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/oh276-mint-share.md)
- [Dependency provenance inventory](https://github.com/Dood-Labs-One-Home/One-Home/blob/3ce2e12c882d9f85da2cf47ba780e3070352d228/docs/oh276-dependency-provenance.json)

This report adds documentation. It does not approve a production release, activate a chain, or replace an independent security audit.
