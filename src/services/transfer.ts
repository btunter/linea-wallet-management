import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import { USDC_MINT } from "../utils/constants";

export async function createTransferTransaction(
  connection: Connection,
  fromKeypair: Keypair,
  toPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  const transaction = new Transaction();

  // Get the from and to token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    fromKeypair.publicKey
  );

  const toTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    toPublicKey
  );

  // Check if destination token account exists
  const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);

  // If destination token account doesn't exist, create it
  if (!toTokenAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromKeypair.publicKey, // payer
        toTokenAccount, // ata
        toPublicKey, // owner
        USDC_MINT // mint
      )
    );
  }

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      fromTokenAccount, // source
      toTokenAccount, // destination
      fromKeypair.publicKey, // owner
      amount * Math.pow(10, 6) // amount in USDC (6 decimals)
    )
  );

  // Get latest blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromKeypair.publicKey;

  return transaction;
}
