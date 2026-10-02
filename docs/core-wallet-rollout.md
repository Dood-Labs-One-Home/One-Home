# Core Wallet in One Home

This change adds Core to One Home Passport Wallets for Avalanche C-Chain EVM, X-Chain, and P-Chain mainnet accounts.

## User flow

1. Open One Home Passport → Wallets.
2. Choose Avalanche for the EVM C-Chain wallet, or Avalanche X-Chain / Avalanche P-Chain for the native wallet.
3. Select **Core Wallet**.
4. Approve the connection in Core, then approve One Home's wallet ownership message.
5. One Home links the wallet only after the server verifies the signature and reads back the verified Passport wallet row.

The X/P wallet is saved with the chain prefix (X-avax1… or P-avax1…) required when an Avalanche address is used for a chain-specific transfer. A 0x… C-Chain address and an X/P native address remain separate rows and separate ecosystems. No address supplied in chat is stored in source.

Linking is an off-chain ownership check: it sends no AVAX transaction and needs no gas. It does not test minting or an on-chain transfer.

## Security and data flow

- The signed message binds the One Home origin, selected Avalanche chain, wallet address, Passport session, nonce, expiry, and one-time challenge ID.
- EVM proof uses Core's EIP-1193 personal_sign method and server-side EIP-191 recovery.
- X/P proof uses Core's avalanche_signMessage; the server decodes and recovers the Avalanche public key, derives its mainnet XP address, and compares it with the exact X/P address.
- Passport identity comes from the verified Supabase Auth bearer token. The browser never supplies the owning user ID and never writes a verified wallet row.
- Database RPCs consume challenges and insert or refresh verified rows atomically. A verified address cannot be claimed by another Passport.
- C-Chain mainnet minting, payments, and payouts remain disabled. X/P entries are wallet-only and remain marked locked for mainnet transactions.

## Files

- apps/one-home/index.html adds the Core provider and the two native X/P entries to the existing Passport Wallets tree.
- apps/one-home/passport/core-wallet.js connects through Core's EIP-1193 / EIP-6963 provider.
- supabase/functions/onehome-core-wallet/index.ts validates the Passport session and Core ownership proofs.
- supabase/migrations/20261002193000_core_wallet_linking.sql registers the chains and adds the one-time challenge / atomic completion routines.

## Review and test sequence

These source changes are not deployed by this pull request.

1. Apply the migration to a Supabase development branch and confirm the registry has Core on avalanche-mainnet, plus wallet-only avalanche-x-mainnet and avalanche-p-mainnet.
2. Deploy onehome-core-wallet to that development branch with **Verify JWT OFF**. The function validates the Passport bearer token internally; the service role key stays server-side.
3. Publish a preview build of the One Home static files.
4. In Core Extension, connect the matching account and complete the three message-signature checks: C-Chain, X-Chain, and P-Chain. Confirm all rows reload from passport_chain_wallets, copy the prefixed X/P address, rename, make active, remove, and verify cross-Passport address conflicts are rejected.
5. Keep Avalanche C-Chain minting and native X/P transactions locked until separate end-to-end mainnet transaction tests are approved and passed.

## Official references

- [Connect to Core Extension](https://docs.core.app/docs/connect-your-dapp/core-extension/)
- [Core-specific methods](https://docs.core.app/docs/reference/core-methods/)
- [Core signing methods](https://docs.core.app/docs/reference/signing-methods/)
- [Avalanche cryptographic primitives](https://build.avax.network/docs/rpcs/other/standards/cryptographic-primitives)
- [Avalanche SDK account utilities](https://build.avax.network/docs/tooling/avalanche-sdk/client/accounts/local/utilities)
- [Core X/P address prefixes](https://support.core.app/en/articles/8133669-core-web-faq)