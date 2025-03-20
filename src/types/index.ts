import { Context, SessionFlavor } from "grammy";
import { Keypair } from "@solana/web3.js";

export interface WalletData {
  publicKey: string;
  secretKey: string;
  createdAt: number;
  seedPhraseBackedUp: boolean; // Track if seed phrase has been backed up
  seedPhrase?: string; // Store temporarily for backup
}

export interface UserData {
  wallet: WalletData;
}

export interface SessionData {
  userId?: string;
  waitingForMintAmount?: boolean;
  waitingForConversionAmount?: boolean;
  waitingForWithdrawalAmount?: boolean;
  waitingForAddress?: boolean;
  waitingForResetConfirmation?: boolean;
  withdrawalAmount?: number;
  waitingForSeedPhrase?: boolean;
}

export type MyContext = Context & SessionFlavor<SessionData>;
