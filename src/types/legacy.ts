// ===============================================================
//  Legacy Memory Types — IDL v1.0.0+
//  Buffer, Digest, MemoryChunk, MemoryEntry, Plugin types
// ===============================================================

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Buffer account for chunked memory storage.
 * Used for large data uploads with pagination.
 */
export interface BufferAccount {
  bump: number;
  session: PublicKey;
  authority: PublicKey;
  page_index: number;
  max_size: number;
  current_size: number;
  num_entries: number;
  created_at: BN;
  updated_at: BN;
}

/**
 * Digest account for proof-of-memory verification.
 * Stores merkle root and content hash for permanent inscription.
 */
export interface DigestAccount {
  bump: number;
  session: PublicKey;
  authority: PublicKey;
  content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_chunks: number;
  inscribed_at: BN;
  created_at: BN;
}

/**
 * MemoryChunk account for fragmented memory storage.
 * Each chunk contains encrypted data fragment.
 */
export interface MemoryChunk {
  bump: number;
  vault: PublicKey;
  session: PublicKey;
  sequence: number;
  fragment_index: number;
  total_fragments: number;
  compression: number;
  epoch_index: number;
  created_at: BN;
}

/**
 * MemoryEntry account for inscribed memory proof.
 * Permanent storage via transaction log inscription.
 */
export interface MemoryEntry {
  bump: number;
  vault: PublicKey;
  session: PublicKey;
  sequence: number;
  content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_bytes: number;
  inscribed_at: BN;
  created_at: BN;
}

/**
 * Plugin account for agent plugin references.
 * Tracks active plugins and their configurations.
 */
export interface PluginRef {
  bump: number;
  agent: PublicKey;
  plugin_id: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  plugin_uri: string;
  is_active: boolean;
  created_at: BN;
  updated_at: BN;
}

/**
 * Event emitted when buffer is created.
 */
export interface BufferCreatedEvent {
  session: PublicKey;
  buffer: PublicKey;
  authority: PublicKey;
  page_index: number;
  timestamp: BN;
}

/**
 * Event emitted when data is appended to buffer.
 */
export interface BufferAppendedEvent {
  session: PublicKey;
  buffer: PublicKey;
  page_index: number;
  chunk_size: number;
  total_size: number;
  num_entries: number;
  timestamp: BN;
}

/**
 * Event emitted when digest is inscribed.
 */
export interface DigestInscribedEvent {
  session: PublicKey;
  digest: PublicKey;
  authority: PublicKey;
  content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_chunks: number;
  timestamp: BN;
}

/**
 * Event emitted when memory is stored.
 */
export interface MemoryStoredEvent {
  vault: PublicKey;
  session: PublicKey;
  sequence: number;
  total_bytes: number;
  timestamp: BN;
}

/**
 * Event emitted when memory chunk is appended.
 */
export interface MemoryChunkAppendedEvent {
  vault: PublicKey;
  session: PublicKey;
  sequence: number;
  fragment_index: number;
  total_fragments: number;
  timestamp: BN;
}

/**
 * Event emitted when plugin is registered.
 */
export interface PluginRegisteredEvent {
  agent: PublicKey;
  plugin_id: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  plugin_uri: string;
  timestamp: BN;
}
