# Avalanche Mainnet Readiness

One Home currently runs Avalanche NFT minting on **Fuji testnet** (`43113` / `0xa869`).

Avalanche Mainnet (`43114` / `0xa86a`) is represented in the public chain identity and mint-page fallback as **locked**:

- wallet connection: disabled
- minting: disabled
- payments: disabled
- no mainnet contract address is claimed
- no mainnet transaction has been performed

Mainnet activation requires a funded deployment wallet, a verified contract address, metadata and ownership checks, and a controlled test mint before public activation. Fuji remains the active Avalanche network until those checks are complete.
