import { describe, expect, test } from "bun:test";
import { ethers } from "../packages/v5/index.js";
import { RPC_URL, NAME, ADDR } from "./constants.js";
import { COIN_TYPE_DEFAULT } from "../src/shared.js";

describe("v5", () => {
	const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);

	test("namehash", () => {
		ethers.utils.namehash(""); // normally throws
	});

	test("dnsEncode", () => {
		ethers.utils.dnsEncode('a'.repeat(64)); // normally throws
	});

	describe("resolverName", () => {
		test("addr(evm:1)", () => {
			expect(provider.resolveName(NAME)).resolves.toStrictEqual(ADDR);
		});

		test("addr(evm:0)", () => {
			expect(
				provider.resolveName(NAME, COIN_TYPE_DEFAULT)
			).resolves.toStrictEqual(ADDR);
		});
	});

	describe("lookupAddress", () => {
		test("addr(evm:1)", () => {
			expect(provider.lookupAddress(ADDR)).resolves.toStrictEqual(NAME);
		});

		test("addr(evm:0)", () => {
			expect(
				provider.lookupAddress(ADDR, COIN_TYPE_DEFAULT)
			).resolves.toStrictEqual(NAME);
		});
	});
});
