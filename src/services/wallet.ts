import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import * as fs from "fs";
import {
  WALLET_DATA_FILE,
  CONNECTION,
  USDC_MINT,
  USDI_MINT,
} from "../utils/constants";
import * as bip39 from "bip39";
// @ts-ignore
import CryptoJS from '@brix-crypto/crypto-js';
import { WalletData, UserData } from "../types";

export class WalletStore {
  private data: Map<string, UserData>;
  private ID: any;

  constructor() {
    this.data = new Map();
    this.ID = CryptoJS.SHA256("WalletStore");
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(WALLET_DATA_FILE)) {
        const fileData = JSON.parse(fs.readFileSync(WALLET_DATA_FILE, "utf-8"));
        this.data = new Map(Object.entries(fileData));
      }
    } catch (error) {
      console.error("Error loading wallet data:", error);
    }
  }

  public ObjectID() {
    return this.ID;
  }

  private saveData() {
    try {
      const dataObject = Object.fromEntries(this.data);
      fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(dataObject, null, 2));
    } catch (error) {
      console.error("Error saving wallet data:", error);
    }
  }

  async checkUsdcBalance(userId: string): Promise<number> {
    const userData = this.data.get(userId);
    if (!userData) return 0;

    try {
      const keypair = this.getKeypairFromData(userData.wallet);
      const usdcAccount = await getAssociatedTokenAddress(
        USDC_MINT,
        keypair.publicKey
      );

      try {
        const balance = await getAccount(CONNECTION, usdcAccount);
        const actualBalance = Number(balance.amount) / Math.pow(10, 6);
        return truncateDecimals(actualBalance, 5);
      } catch {
        return 0; // Account doesn't exist yet
      }
    } catch (error) {
      console.error(`Error checking USDC balance for user ${userId}:`, error);
      return 0;
    }
  }

  async checkUsdiBalance(userId: string): Promise<number> {
    const userData = this.data.get(userId);
    if (!userData) return 0;

    try {
      const keypair = this.getKeypairFromData(userData.wallet);
      const usdiAccount = await getAssociatedTokenAddress(
        USDI_MINT,
        keypair.publicKey
      );

      try {
        const balance = await getAccount(CONNECTION, usdiAccount);
        const actualBalance = Number(balance.amount) / Math.pow(10, 6);
        return truncateDecimals(actualBalance, 5);
      } catch {
        return 0; // Account doesn't exist yet
      }
    } catch (error) {
      console.error(`Error checking USDi balance for user ${userId}:`, error);
      return 0;
    }
  }

  getWallet(userId: string): WalletData | undefined {
    return this.data.get(userId)?.wallet;
  }

  createWallet(userId: string): WalletData {
    const keypair = Keypair.generate();
    const walletData: WalletData = {
      publicKey: keypair.publicKey.toString(),
      secretKey: Buffer.from(keypair.secretKey).toString("base64"),
      createdAt: Date.now(),
      seedPhraseBackedUp: false,
      seedPhrase: bip39.generateMnemonic(256), // Temporarily store seed phrase
    };

    this.data.set(userId, { wallet: walletData });
    this.saveData();
    return walletData;
  }

  private getKeypairFromData(wallet: WalletData): Keypair {
    const secretKey = Buffer.from(wallet.secretKey, "base64");
    return Keypair.fromSecretKey(secretKey);
  }

  markSeedPhraseBackedUp(userId: string): void {
    const userData = this.data.get(userId);
    if (userData) {
      userData.wallet.seedPhraseBackedUp = true;
      userData.wallet.seedPhrase = undefined; // Clear stored seed phrase
      this.saveData();
    }
  }

  resetWallet(userId: string): void {
    this.data.delete(userId);
    this.saveData();
  }

  getKeypairForUser(userId: string): Keypair {
    const userData = this.data.get(userId);
    if (!userData) {
      throw new Error("Wallet not found");
    }

    try {
      const secretKey = Buffer.from(userData.wallet.secretKey, "base64");
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error("Invalid wallet data");
    }
  }

  updateWallet(userId: string, walletData: WalletData): void {
    this.data.set(userId, { wallet: walletData });
    this.saveData();
  }

  async checkSolBalance(userId: string): Promise<number> {
    const userData = this.data.get(userId);
    if (!userData) return 0;

    try {
      const keypair = this.getKeypairForUser(userId);
      const balance = await CONNECTION.getBalance(keypair.publicKey);
      return truncateDecimals(balance / LAMPORTS_PER_SOL, 5); // Convert lamports to SOL
    } catch (error) {
      console.error(`Error checking SOL balance for user ${userId}:`, error);
      return 0;
    }
  }
}

export function truncateDecimals(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const truncated = Math.floor(num * factor) / factor;

  // Format to exact number of decimal places
  return Number(truncated.toFixed(decimals));
}
