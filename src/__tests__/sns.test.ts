import { describe, expect, it } from "vitest";
import { PublicKey, type Connection } from "@solana/web3.js";
import { SnsModule, parseSnsRecordType } from "../modules/sns.js";
import {
  displayDomain,
  isSnsDomain,
  toFullSnsName,
} from "../utils/display-domain.js";
import { getDomainKeySync, getRecordKeySync } from "../utils/sns-adapter.js";

const NULL_CONNECTION = {
  getAccountInfo: async () => null,
  commitment: "confirmed",
} as unknown as Connection;
const SAP_PROGRAM_ID = new PublicKey(
  "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ",
);

describe("SNS Stage 1", () => {
  describe("display rules (display-domain)", () => {
    it("appends .sns to TLD-less names", () => {
      expect(displayDomain("example")).toBe("example.sns");
    });

    it("keeps already-suffixed .sns names unchanged (case-folded)", () => {
      expect(displayDomain(" Example.sub.SNS ")).toBe("example.sub.sns");
    });

    it("rejects legacy .sol inputs", () => {
      expect(() => displayDomain("example.sol")).toThrow(/\.sns/);
    });

    it("normalizes bare names via toFullSnsName", () => {
      expect(toFullSnsName("Brave")).toBe("brave.sns");
      expect(isSnsDomain("brave.sns")).toBe(true);
    });
  });

  describe("record type parsing (v4 enum wire values)", () => {
    it("maps legacy casing to v4 wire values", () => {
      expect(parseSnsRecordType("Pic")).toBe("pic");
      expect(parseSnsRecordType("URL")).toBe("url");
      expect(parseSnsRecordType("TXT")).toBe("TXT");
      expect(parseSnsRecordType("sol")).toBe("SOL");
    });

    it("rejects unknown record types", () => {
      expect(() => parseSnsRecordType("WTF")).toThrow(/unsupported/);
    });
  });

  describe("deterministic derivations", () => {
    it("derives the same domain PDA for equivalent inputs", () => {
      expect(getDomainKeySync("example.sns").pubkey.toBase58()).toBe(
        getDomainKeySync("example").pubkey.toBase58(),
      );
    });

    it("derives the same record PDA for record-type equivalence", () => {
      expect(getRecordKeySync("example", "pic").pubkey.toBase58()).toBe(
        getRecordKeySync("example", "Pic").pubkey.toBase58(),
      );
    });
  });

  describe("SnsModule input rules", () => {
    const sns = new SnsModule({
      connection: NULL_CONNECTION,
      sapProgramId: SAP_PROGRAM_ID,
    });

    it("rejects .sol before any network access (resolve)", async () => {
      await expect(sns.resolve("example.sol")).rejects.toThrow(/\.sns/);
    });

    it("rejects .sol before any network access (checkAvailability)", async () => {
      await expect(sns.checkAvailability("example.sol")).rejects.toThrow(
        /\.sns/,
      );
    });

    it("reports availability from an absent on-chain account", async () => {
      expect(await sns.checkAvailability("stage1-test")).toBe(true);
    });
  });
});
