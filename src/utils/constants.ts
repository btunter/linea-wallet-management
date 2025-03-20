import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

// Connection
export const CONNECTION = new Connection(clusterApiUrl("mainnet-beta"));

export const CLMM_PROGRAM_ID = new PublicKey(
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
);
export const POOL_STATE = new PublicKey(
  "6bGe466weTDXkv8emyRMxFxLDQyXkE7W89zod8e5AGVe"
);
export const AMM_CONFIG = new PublicKey(
  "E64NGkDLLCdQ2yFNPcavaKptrEgmiQaNykUuLC1Qgwyp"
);
export const OBSERVATION_STATE = new PublicKey(
  "8JxwSBohQa42ahYntvoxR91LEvNL9g1232wa5cMRwW4z"
);
export const INPUT_VAULT = new PublicKey(
  "Abd1ehgfMAAhmmVrWENYYLUzNHQrQHtaazr2f1SD6HUE"
);
export const OUTPUT_VAULT = new PublicKey(
  "GrXCVwWjQavypEw41RDiCqQNzj9aEoEdmHG6QaRunjyX"
);
export const OUTPUT_VAULT_2 = new PublicKey(
  "Ary4XMyk4vx2Jd9YGhXZPgR5FFPtKcNb7qPyPXQHBJ1m"
);
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const USDT_MINT = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);
export const USDI_MINT = new PublicKey(
  "CXbKtuMVWc2LkedJjATZDNwaPSN6vHsuBGqYHUC4BN3B"
);

// Config
export const WALLET_DATA_FILE = "wallet_data.json";
