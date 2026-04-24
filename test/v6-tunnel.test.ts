import { describe, expect, test } from "bun:test";
import { ethers } from "../packages/v6/index.js";
import { ABI_FRAGMENTS, UR_PROXY } from "../src/shared.js";
import {
	RPC_URL,
	BATCH_GATEWAYS,
	NAME_TUNNEL,
	ADDR,
	isTrustedURL,
} from "./constants.js";

function newProvider() {
	const provider = new ethers.JsonRpcProvider(RPC_URL, 1, {
		staticNetwork: true,
	});
	provider.on("debug", (x) => {
		if (x.action === "sendCcipReadFetchRequest" && x.urls.some((x: string) => !isTrustedURL(x))) {
			x.request.cancel();
		}
	});
	return provider;
}

describe("v6-tunnel", () => {
	test("getTunnelingBatchGateways", () => {
		const provider = newProvider();
		expect(provider.getTunnelingBatchGateways()).toStrictEqual([]);
		provider.setTunnelingBatchGateways(BATCH_GATEWAYS);
		expect(provider.getTunnelingBatchGateways()).toStrictEqual(BATCH_GATEWAYS);
		provider.setTunnelingBatchGateways([]);
		expect(provider.getTunnelingBatchGateways()).toStrictEqual([]);
	});

	describe("setTunnelingBatchGateways", () => {
		test("UR", async () => {
			const provider = newProvider();
			const UR = new ethers.Contract(UR_PROXY, ABI_FRAGMENTS, provider);
			provider.setTunnelingBatchGateways(BATCH_GATEWAYS);
			const [addr] = UR.interface.decodeFunctionResult(
				"addr(bytes32)",
				await UR.resolve(
					ethers.dnsEncode(NAME_TUNNEL),
					UR.interface.encodeFunctionData("addr(bytes32)", [
						ethers.namehash(NAME_TUNNEL),
					]),
					{ enableCcipRead: true },
				),
			);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct", async () => {
			const provider = newProvider();
			provider.setTunnelingBatchGateways(BATCH_GATEWAYS);
			const addr = await provider.resolveName(NAME_TUNNEL);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct w/o tunnel", async () => {
			const provider = newProvider();
			expect(provider.resolveName(NAME_TUNNEL)).rejects.toThrow();
		});
	});
});
