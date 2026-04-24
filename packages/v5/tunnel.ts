import { Interface } from "@ethersproject/abi";
import { Logger } from "@ethersproject/logger";
import { BaseProvider } from "@ethersproject/providers";

type BatchGatewayList = string[];

const LOCAL_BATCH_GATEWAY_URL = "x-batch-gateway:true";
const LOGGER = new Logger("tunnel-patch");
const BATCH_GATEWAY_ABI = new Interface([
	`function query((address, string[], bytes)[]) view returns (bool[], bytes[])`,
]);

let tunnellingBatchGateways: BatchGatewayList = [];

const { ccipReadFetch } = BaseProvider.prototype;
const tunnellingCcipReadFetch: typeof ccipReadFetch = async function (
	this: BaseProvider,
	tx,
	calldata,
	urls,
) {
	if (this.disableCcipRead || !urls.length || !tx.to) {
		return null;
	}
	if (urls.includes(LOCAL_BATCH_GATEWAY_URL)) {
		return ccipReadFetch.call(this, tx, calldata, urls);
	}
	const sender = tx.to.toLowerCase();
	const response = await ccipReadFetch.call(
		this,
		tx,
		BATCH_GATEWAY_ABI.encodeFunctionData("query", [[[sender, urls, calldata]]]),
		tunnellingBatchGateways,
	);
	if (!response) return null;
	const [failures, responses] = BATCH_GATEWAY_ABI.decodeFunctionResult(
		"query",
		response,
	);
	if (failures[0]) {
		const error = "batch gateway failed";
		return LOGGER.throwError(
			`error encountered during CCIP fetch: ${error}`,
			Logger.errors.SERVER_ERROR,
			{
				urls,
				errorMessages: [error],
			},
		);
	}
	return responses[0];
};

export function setTunnelingBatchGateways(urls: BatchGatewayList) {
	tunnellingBatchGateways = urls;
	BaseProvider.prototype.ccipReadFetch = urls.length
		? tunnellingCcipReadFetch
		: ccipReadFetch;
}

export function getTunnelingBatchGateways(): BatchGatewayList {
	return tunnellingBatchGateways;
}
