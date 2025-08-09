import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePasswordHash, generateJWTSecret } from "../auth.js";

vi.mock("bcryptjs", () => ({
    default: {
        genSalt: vi.fn(),
        hash: vi.fn(),
    },
    genSalt: vi.fn(),
    hash: vi.fn(),
}));

vi.mock("node:crypto", () => ({
    default: {
        randomBytes: vi.fn(),
    },
    randomBytes: vi.fn(),
}));

import bcrypt from "bcryptjs";
import crypto from "node:crypto";

describe("auth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generatePasswordHash", () => {
        it("should generate a password hash with salt", async () => {
            const mockSalt = "mocksalt123";
            const mockHashValue = "mockedhash456";
            const password = "testpassword";

            (bcrypt.genSalt as any).mockResolvedValue(mockSalt);
            (bcrypt.hash as any).mockResolvedValue(mockHashValue);

            const result = await generatePasswordHash(password);

            expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
            expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
            expect(result).toBe(mockHashValue);
        });

        it("should handle empty password", async () => {
            const mockSalt = "mocksalt123";
            const mockHashValue = "emptyhash";
            const password = "";

            (bcrypt.genSalt as any).mockResolvedValue(mockSalt);
            (bcrypt.hash as any).mockResolvedValue(mockHashValue);

            const result = await generatePasswordHash(password);

            expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
            expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
            expect(result).toBe(mockHashValue);
        });

        it("should handle special characters in password", async () => {
            const mockSalt = "mocksalt123";
            const mockHashValue = "specialhash";
            const password = "p@ssw0rd!#$%^&*()";

            (bcrypt.genSalt as any).mockResolvedValue(mockSalt);
            (bcrypt.hash as any).mockResolvedValue(mockHashValue);

            const result = await generatePasswordHash(password);

            expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
            expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
            expect(result).toBe(mockHashValue);
        });

        it("should handle bcrypt.genSalt errors", async () => {
            const password = "testpassword";
            const error = new Error("Salt generation failed");

            (bcrypt.genSalt as any).mockRejectedValue(error);

            await expect(generatePasswordHash(password)).rejects.toThrow("Salt generation failed");
            expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });

        it("should handle bcrypt.hash errors", async () => {
            const mockSalt = "mocksalt123";
            const password = "testpassword";
            const error = new Error("Hash generation failed");

            (bcrypt.genSalt as any).mockResolvedValue(mockSalt);
            (bcrypt.hash as any).mockRejectedValue(error);

            await expect(generatePasswordHash(password)).rejects.toThrow("Hash generation failed");
            expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
            expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
        });
    });

    describe("generateJWTSecret", () => {
        it("should generate a JWT secret using crypto.randomBytes", () => {
            const mockBytes = Buffer.from("mockrandomdata123456789012345678901234567890123456789012345678901234");
            const expectedHex = mockBytes.toString('hex');

            (crypto.randomBytes as any).mockReturnValue(mockBytes);

            const result = generateJWTSecret();

            expect(crypto.randomBytes).toHaveBeenCalledWith(64);
            expect(result).toBe(expectedHex);
        });

        it("should generate different secrets on multiple calls", () => {
            const mockBytes1 = Buffer.from("mockrandomdata1234567890123456789012345678901234567890123456789012345");
            const mockBytes2 = Buffer.from("differentrandomdata123456789012345678901234567890123456789012345678901");

            (crypto.randomBytes as any)
                .mockReturnValueOnce(mockBytes1)
                .mockReturnValueOnce(mockBytes2);

            const result1 = generateJWTSecret();
            const result2 = generateJWTSecret();

            expect(result1).toBe(mockBytes1.toString('hex'));
            expect(result2).toBe(mockBytes2.toString('hex'));
            expect(result1).not.toBe(result2);
            expect(crypto.randomBytes).toHaveBeenCalledTimes(2);
        });

        it("should handle crypto.randomBytes errors", () => {
            const error = new Error("Random bytes generation failed");

            (crypto.randomBytes as any).mockImplementation(() => {
                throw error;
            });

            expect(() => generateJWTSecret()).toThrow("Random bytes generation failed");
            expect(crypto.randomBytes).toHaveBeenCalledWith(64);
        });

        it("should return a hex string of correct length", () => {
            const mockBytes = Buffer.alloc(64, 'a');
            (crypto.randomBytes as any).mockReturnValue(mockBytes);

            const result = generateJWTSecret();

            expect(result).toHaveLength(128); // 64 bytes * 2 hex chars per byte
            expect(result).toMatch(/^[0-9a-f]+$/); // Only hex characters
        });
    });
});
