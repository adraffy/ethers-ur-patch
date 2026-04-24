import {
	EnsResolver,
	AbstractProvider,
	Contract,
	dnsEncode,
	assert,
	isHexString,
	assertArgument,
	type BigNumberish,
	getBigInt,
	Interface,
	isError,
	namehash,
	getAddress,
	ensNormalize,
	isCallException,
} from "ethers";
import {
	ABI_FRAGMENTS,
	COIN_TYPE_ETH,
	EXTERNAL_BATCH_GATEWAY_ERROR,
	getReverseName,
	isEVMCoinType,
	LOCAL_BATCH_GATEWAY,
	UR_PROXY,
} from "../../src/shared.js";

export * from "ethers";

const TUNNEL_STORAGE = Symbol("tunnelingBatchGateways");

declare module "ethers" {
	namespace EnsResolver {
		function fromNameOld(
			provider: AbstractProvider,
			name: string,
		): Promise<EnsResolver | null>;
	}
	interface AbstractProvider {
		resolveName(name: string, coinType?: BigNumberish): Promise<string | null>;
		lookupAddress(
			address: string,
			coinType?: BigNumberish,
		): Promise<string | null>;
		setTunnelingBatchGateways(urls: string[]): void;
		getTunnelingBatchGateways(): string[];
	}
}

interface TunnelProvider extends AbstractProvider {
	[TUNNEL_STORAGE]?: string[];
}

if (!EnsResolver.fromNameOld) {
	const ABI = new Interface(ABI_FRAGMENTS);

	// note: AbstractProvider.getResolver() is effectively EnsResolver.fromName()
	EnsResolver.fromNameOld = EnsResolver.fromName;
	//const { fromName } = EnsResolver;
	EnsResolver.fromName = async (provider, name) => {
		//if (name.startsWith("old:")) return fromName(provider, name.slice(4));
		if (!name) return null;
		const dns = dnsEncode(name, 255);
		const UR = new Contract(UR_PROXY, ABI, provider);
		try {
			const result = await UR.requireResolver(dns);
			const resolver = new EnsResolver(provider, result.resolver, name);
			const extended = Promise.resolve(result.extended);
			resolver.supportsWildcard = () => extended;
			return resolver;
		} catch {
			return null;
		}
	};

	const { resolveName, lookupAddress, ccipReadFetch } =
		AbstractProvider.prototype;

	const tunnellingCcipReadFetch: typeof ccipReadFetch = async function (
		this: TunnelProvider,
		tx,
		calldata,
		urls,
	) {
		if (this.disableCcipRead || !urls.length || !tx.to) {
			return null;
		}
		const tunnels = this.getTunnelingBatchGateways();
		if (urls.includes(LOCAL_BATCH_GATEWAY)) {
			return ccipReadFetch.call(this, tx, calldata, tunnels);
		}
		const sender = tx.to.toLowerCase();
		const response = await ccipReadFetch.call(
			this,
			tx,
			ABI.encodeFunctionData("query", [[[sender, urls, calldata]]]),
			tunnels,
		);
		if (!response) return null;
		const [failures, responses] = ABI.decodeFunctionResult("query", response);
		if (failures[0]) {
			const error = `${EXTERNAL_BATCH_GATEWAY_ERROR}: ${responses[0]}`;
			assert(
				false,
				`error encountered during CCIP fetch: ${error}`,
				"OFFCHAIN_FAULT",
				{
					reason: "500_SERVER_ERROR",
					transaction: tx,
					info: { urls, errorMessages: [error] },
				},
			);
		}
		return responses[0];
	};

	AbstractProvider.prototype.setTunnelingBatchGateways = function (
		this: TunnelProvider,
		urls,
	) {
		this[TUNNEL_STORAGE] = urls.length ? urls : undefined;
		this.ccipReadFetch = urls ? tunnellingCcipReadFetch : (undefined as any);
	};

	AbstractProvider.prototype.getTunnelingBatchGateways = function (
		this: TunnelProvider,
	) {
		return this[TUNNEL_STORAGE] ?? [];
	};

	AbstractProvider.prototype.resolveName = async function (
		name,
		coinType: BigNumberish = COIN_TYPE_ETH,
	) {
		if (coinType === "old") return resolveName.call(this, name);
		coinType = getBigInt(coinType, "coinType");
		const fwd = await this.getResolver(name);
		if (!fwd) return null;
		try {
			const a = await fetchAddress(fwd, coinType);
			if (/^0x0+$/.test(a)) return null;
			return a;
		} catch (err: unknown) {
			if (isCallException(err)) return null;
			throw err;
		}
	};

	AbstractProvider.prototype.lookupAddress = async function (
		address,
		coinType: BigNumberish = COIN_TYPE_ETH,
	) {
		if (coinType === "old") return lookupAddress.call(this, address);
		assertArgument(
			isHexString(address) && address !== "0x",
			"invalid address",
			"address",
			address,
		);
		address = address.toLowerCase();
		coinType = getBigInt(coinType, "coinType");
		const reverseName = getReverseName(address, coinType);
		try {
			const rev = await this.getResolver(reverseName);
			if (rev) {
				const name = await callResolver<string>(rev, "name");
				if (name && ensNormalize(name) === name) {
					const fwd = await this.getResolver(name);
					if (fwd) {
						const checked = await fetchAddress(fwd, coinType).then(
							(x) => x.toLowerCase(),
							() => {},
						);
						if (checked) {
							assert(
								address === checked,
								"address->name->address mismatch",
								"BAD_DATA",
								{ value: [address, checked] },
							);
							return name;
						}
					}
				}
			}
			return null;
		} catch (err) {
			if (isError(err, "BAD_DATA") && err.value === "0x") {
				return null;
			}
			if (isCallException(err)) return null;
			throw err;
		}
	};

	async function fetchAddress(resolver: EnsResolver, coinType: bigint) {
		if (coinType === COIN_TYPE_ETH) {
			return callResolver<string>(resolver, "addr(bytes32)");
		}
		const a = await callResolver<string>(
			resolver,
			"addr(bytes32,uint256)",
			coinType,
		);
		return isEVMCoinType(coinType)
			? a === "0x"
				? a.padEnd(42, "0")
				: getAddress(a)
			: a;
	}

	async function callResolver<T>(
		resolver: EnsResolver,
		fragment: string,
		...args: any[]
	): Promise<T> {
		const f = ABI.getFunction(fragment)!;
		const r = new Contract(resolver.address, ABI, resolver.provider);
		if (await resolver.supportsWildcard()) {
			const res: any = ABI.decodeFunctionResult(
				f,
				await r.resolve(
					dnsEncode(resolver.name, 255),
					ABI.encodeFunctionData(f, [namehash(resolver.name), ...args]),
					{ enableCcipRead: true },
				),
			);
			return f.outputs.length === 1 ? res[0] : res;
		} else {
			return r[f.format()](namehash(resolver.name), ...args, {
				enableCcipRead: true,
			});
		}
	}
}
