import { describe, expect, test } from "bun:test";
import {
	setTunnelingBatchGateways,
	getTunnelingBatchGateways,
} from "../packages/v5/tunnel.js";
import { ABI_FRAGMENTS, UR_PROXY } from "../src/shared.js";
import { ADDR, RPC_URL } from "./constants.js";
import { ethers } from "ethers";

const BATCH_GATEWAYS = ["https://ccip-v3.ens.xyz"];

describe("v5-tunnel", () => {
	const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);

	setTunnelingBatchGateways(BATCH_GATEWAYS);

	test("getTunnelingBatchGateways", () => {
		expect(getTunnelingBatchGateways()).toStrictEqual(BATCH_GATEWAYS);
	});

	describe("setTunnelingBatchGateways", () => {
		const name = "raffy.base.eth";
		const UR = new ethers.Contract(UR_PROXY, ABI_FRAGMENTS, provider);

		test("UR", async () => {
			const [addr] = UR.interface.decodeFunctionResult(
				"addr(bytes32)",
				await UR.resolve(
					ethers.utils.dnsEncode(name),
					UR.interface.encodeFunctionData("addr(bytes32)", [
						ethers.utils.namehash(name),
					]),
					{ ccipReadEnabled: true },
				),
			);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct", async () => {
			setTunnelingBatchGateways(["https://ccip-v3.ens.xyz"]);
			const addr = await provider.resolveName(name);
			expect(addr).toStrictEqual(ADDR);
		});
	});
});
