import { describe, expect, test } from "bun:test";
import https from "node:https";
import { ethers } from "../packages/v5/index.js";
import { ABI_FRAGMENTS, UR_PROXY } from "../src/shared.js";
import { RPC_URL, BATCH_GATEWAYS, NAME_TUNNEL, ADDR, isTrustedURL } from "./constants.js";

// v5 does not use fetch()...
const { request } = https;
const hackedRequest = (conn: any, opts?: any, cb?: any) => {
	if (!isTrustedURL(`https://${typeof conn === "string" ? conn : conn.hostname}`)) {
		throw new Error("tunnel failed");
	}
	return request(conn, opts, cb);
};
https.request = hackedRequest as any;

describe("v5-tunnel", () => {
	test("getTunnelingBatchGateways", () => {
		const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);
		expect(provider.getTunnelingBatchGateways()).toStrictEqual([]);
		provider.setTunnelingBatchGateways(BATCH_GATEWAYS);
		expect(provider.getTunnelingBatchGateways()).toStrictEqual(BATCH_GATEWAYS);
		provider.setTunnelingBatchGateways([]);
		expect(provider.getTunnelingBatchGateways()).toStrictEqual([]);
	});

	describe("setTunnelingBatchGateways", () => {
		test("UR", async () => {
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);
			const UR = new ethers.Contract(UR_PROXY, ABI_FRAGMENTS, provider);
			provider.setTunnelingBatchGateways(BATCH_GATEWAYS);
			const [addr] = UR.interface.decodeFunctionResult(
				"addr(bytes32)",
				await UR.resolve(
					ethers.utils.dnsEncode(NAME_TUNNEL),
					UR.interface.encodeFunctionData("addr(bytes32)", [
						ethers.utils.namehash(NAME_TUNNEL),
					]),
					{ ccipReadEnabled: true },
				),
			);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct", async () => {
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);
			provider.setTunnelingBatchGateways(BATCH_GATEWAYS);
			const addr = await provider.resolveName(NAME_TUNNEL);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct w/o tunnel", async () => {
			const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);
			expect(provider.resolveName(NAME_TUNNEL)).rejects.toThrow();
		});
	});
});
