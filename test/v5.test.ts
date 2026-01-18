import { describe, expect, test } from "bun:test";
import { ethers } from "../packages/v5/index.js";
import {
	RPC_URL,
	NAME,
	ADDR,
	NAME_DNE,
	NAME_UNNORM,
	ADDR_DNE,
	NAME_ZERO,
} from "./constants.js";
import { COIN_TYPE_DEFAULT } from "../src/shared.js";
import { requireThrow } from "./utils.js";

describe("v5", () => {
	const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);

	test("namehash", () => {
		ethers.utils.namehash(""); // normally throws
	});

	test("dnsEncode", () => {
		ethers.utils.dnsEncode("a".repeat(64)); // normally throws
	});

	test("ensNormalize", () => {
		const emoji = "\u{1F6D8}"; // unicode 17
		expect(ethers.utils.ensNormalize(emoji)).toStrictEqual(emoji); // normally not exposed
	});

	describe("getResolver", () => {
		test("supportsWildcard()", async () => {
			const r0 = (await provider.getResolverOld(NAME))!;
			const r1 = (await provider.getResolver(NAME))!;
			expect(Bun.peek.status(r0.supportsWildcard())).toStrictEqual("pending");
			expect(Bun.peek.status(r1.supportsWildcard())).toStrictEqual("fulfilled");
		});

		test("same", async () => {
			const r0 = (await provider.getResolverOld(NAME))!;
			const r1 = (await provider.getResolver(NAME))!;
			expect(r1.address, "address").toStrictEqual(r0.address);
			expect(r1.name, "name").toStrictEqual(r0.name);
		});

		test("dne", async () => {
			const a = await provider.getResolverOld(NAME_DNE);
			const b = await provider.getResolver(NAME_DNE);
			expect(a).toStrictEqual(b);
		});

		test("empty", async () => {
			const a = await provider.getResolverOld("");
			const b = await provider.getResolver("");
			expect(a).toStrictEqual(b);
		});
	});

	describe("resolveName", () => {
		test("addr(evm:1)", () => {
			expect(provider.resolveName(NAME)).resolves.toStrictEqual(ADDR);
		});

		test("addr(evm:0)", () => {
			expect(
				provider.resolveName(NAME, COIN_TYPE_DEFAULT)
			).resolves.toStrictEqual(ADDR);
		});

		test("dne", async () => {
			const a = await provider.resolveName(NAME_DNE, "old");
			const b = await provider.resolveName(NAME_DNE);
			expect(a).toStrictEqual(b);
		});

		test("empty", async () => {
			const a = await provider.resolveName("", "old");
			const b = await provider.resolveName("");
			expect(a).toStrictEqual(b);
		});

		test("zero", async () => {
			const a = await provider.resolveName(NAME_ZERO, "old");
			const b = await provider.resolveName(NAME_ZERO);
			expect(a).toStrictEqual(b);
		});

		test("unnormalized", async () => {
			const a = await provider.resolveName(NAME_UNNORM, "old");
			const b = await provider.resolveName(NAME_UNNORM);
			expect(a).toStrictEqual(b);
		});

		test("unimplemented", async () => {
			const p = new ethers.providers.BaseProvider(1);
			const a = await p.resolveName(NAME, "old");
			const b = await p.resolveName(NAME);
			expect(a).toStrictEqual(b);
		});

		test("error", async () => {
			const p = new ethers.providers.BaseProvider(1);
			p.call = () => Promise.reject();
			const a = await p.resolveName(NAME, "old");
			const b = await p.resolveName(NAME);
			expect(a).toStrictEqual(b);
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

		test("dne", async () => {
			const a = await provider.lookupAddress(ADDR_DNE, "old");
			const b = await provider.lookupAddress(ADDR_DNE);
			expect(a).toStrictEqual(b);
		});

		test("0x", async () => {
			const a = await requireThrow(() => provider.lookupAddress("0x", "old"));
			const b = await requireThrow(() => provider.lookupAddress("0x"));
			expect(a).toStrictEqual(b);
		});

		test("empty", async () => {
			const a = await requireThrow(() => provider.lookupAddress("", "old"));
			const b = await requireThrow(() => provider.lookupAddress(""));
			expect(a).toStrictEqual(b);
		});

		test("not address", async () => {
			const a = await requireThrow(() => provider.lookupAddress("a", "old"));
			const b = await requireThrow(() => provider.lookupAddress("a"));
			expect(a).toStrictEqual(b);
		});
	});
});
