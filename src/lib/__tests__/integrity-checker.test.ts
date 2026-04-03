import {
  computeFileHash,
  computeBlobHash,
  verifyHash,
} from "../document-vault/integrity-checker";

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockFile(content: string, name = "test.pdf"): File {
  return new File([content], name, { type: "application/pdf" });
}

function createMockBlob(content: string): Blob {
  return new Blob([content], { type: "application/pdf" });
}

// ── computeFileHash ────────────────────────────────────────────────────────

describe("computeFileHash", () => {
  it("returns a 64-character hex string (SHA-256)", async () => {
    const file = createMockFile("hello world");
    const hash = await computeFileHash(file);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the same hash for identical content", async () => {
    const file1 = createMockFile("same content");
    const file2 = createMockFile("same content");

    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);

    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different content", async () => {
    const file1 = createMockFile("content A");
    const file2 = createMockFile("content B");

    const hash1 = await computeFileHash(file1);
    const hash2 = await computeFileHash(file2);

    expect(hash1).not.toBe(hash2);
  });

  it("handles empty files", async () => {
    const file = createMockFile("");
    const hash = await computeFileHash(file);

    expect(hash).toHaveLength(64);
    // SHA-256 of empty string is well-known
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("handles files with unicode content", async () => {
    const file = createMockFile("Factura de Pescaderías O Grove — 456,80 €");
    const hash = await computeFileHash(file);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── computeBlobHash ────────────────────────────────────────────────────────

describe("computeBlobHash", () => {
  it("returns a 64-character hex string", async () => {
    const blob = createMockBlob("test blob");
    const hash = await computeBlobHash(blob);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("matches File hash for same content", async () => {
    const content = "matching content test";
    const file = createMockFile(content);
    const blob = createMockBlob(content);

    const fileHash = await computeFileHash(file);
    const blobHash = await computeBlobHash(blob);

    expect(fileHash).toBe(blobHash);
  });
});

// ── verifyHash ─────────────────────────────────────────────────────────────

describe("verifyHash", () => {
  it("returns passed=true when hash matches", async () => {
    const content = "document content for verification";
    const file = createMockFile(content);
    const expectedHash = await computeFileHash(file);

    const result = await verifyHash(file, expectedHash);

    expect(result.passed).toBe(true);
    expect(result.actualHash).toBe(expectedHash);
  });

  it("returns passed=false when hash does not match", async () => {
    const file = createMockFile("original content");
    const wrongHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const result = await verifyHash(file, wrongHash);

    expect(result.passed).toBe(false);
    expect(result.actualHash).not.toBe(wrongHash);
  });

  it("works with Blob input", async () => {
    const content = "blob verification test";
    const blob = createMockBlob(content);
    const expectedHash = await computeBlobHash(blob);

    const result = await verifyHash(blob, expectedHash);

    expect(result.passed).toBe(true);
  });

  it("detects tampering (modified content)", async () => {
    const original = createMockFile("Factura F-2026/0412 — 1284.50€");
    const originalHash = await computeFileHash(original);

    const tampered = createMockFile("Factura F-2026/0412 — 9999.99€");
    const result = await verifyHash(tampered, originalHash);

    expect(result.passed).toBe(false);
  });
});
