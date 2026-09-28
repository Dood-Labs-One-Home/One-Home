# Avalanche Mainnet Readiness

One Home currently runs Avalanche NFT minting on **Fuji testnet** (`43113` / `0xa869`).

Avalanche Mainnet (`43114` / `0xa86a`) is represented in the public chain identity and mint-page fallback as **wallet connection only**:

- Passport MetaMask wallet connection and ownership verification: enabled
- minting: disabled
- payments: disabled
- payouts: disabled
- no mainnet contract address is claimed
- no mainnet transaction has been performed

The wallet may be linked to a Passport without a mainnet contract. Linking a wallet does not authorize a mint or payment.

Mainnet mint activation requires a funded deployment wallet, a verified contract address, metadata and ownership checks, and a controlled test mint before public activation. Fuji remains the active Avalanche network until those checks are complete.
