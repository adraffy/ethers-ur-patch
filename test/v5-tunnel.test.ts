import { describe, expect, test } from "bun:test";
import https from "https";
import {
	setTunnelingBatchGateways,
	getTunnelingBatchGateways,
} from "../packages/v5/tunnel.js";
import { ABI_FRAGMENTS, UR_PROXY } from "../src/shared.js";
import { ADDR, RPC_URL } from "./constants.js";
import { ethers } from "ethers";

const NAME = "raffy.base.eth";
const BATCH_GATEWAYS = ["https://ccip-v3.ens.xyz"];

const { request } = https;
const hackedRequest = (conn: any, opts?: any, cb?: any) => {
	const url = `https://${typeof conn === "string" ? conn : conn.hostname}`;
	if (url !== RPC_URL && !BATCH_GATEWAYS.includes(url)) {
		throw "tunnel failed";
	}
	return request(conn, opts, cb);
};
https.request = hackedRequest as any;

describe("v5-tunnel", () => {
	const provider = new ethers.providers.JsonRpcProvider(RPC_URL, 1);

	test("getTunnelingBatchGateways", () => {
		setTunnelingBatchGateways(BATCH_GATEWAYS);

		expect(getTunnelingBatchGateways()).toStrictEqual(BATCH_GATEWAYS);
	});

	describe("setTunnelingBatchGateways", () => {
		const UR = new ethers.Contract(UR_PROXY, ABI_FRAGMENTS, provider);

		test("UR", async () => {
			setTunnelingBatchGateways(BATCH_GATEWAYS);
			const [addr] = UR.interface.decodeFunctionResult(
				"addr(bytes32)",
				await UR.resolve(
					ethers.utils.dnsEncode(NAME),
					UR.interface.encodeFunctionData("addr(bytes32)", [
						ethers.utils.namehash(NAME),
					]),
					{ ccipReadEnabled: true },
				),
			);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct", async () => {
			setTunnelingBatchGateways(BATCH_GATEWAYS);
			const addr = await provider.resolveName(NAME);
			expect(addr).toStrictEqual(ADDR);
		});

		test("direct w/o tunnel", async () => {
			setTunnelingBatchGateways([]);
			expect(provider.resolveName(NAME)).rejects.toThrow('tunnel failed');
		});
	});
});
