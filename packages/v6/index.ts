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
} from "ethers";
import {
	ABI_FRAGMENTS,
	COIN_TYPE_ETH,
	getReverseName,
	isEVMCoinType,
	UR_PROXY,
} from "../../src/shared.js";

export * from "ethers";

declare module "ethers" {
	namespace EnsResolver {
		function fromNameOld(
			provider: AbstractProvider,
			name: string
		): Promise<EnsResolver | null>;
	}
	interface AbstractProvider {
		resolveName(name: string, coinType?: BigNumberish): Promise<string | null>;
		lookupAddress(
			address: string,
			coinType?: BigNumberish
		): Promise<string | null>;
	}
}

const ABI = new Interface(ABI_FRAGMENTS);

// note: AbstractProvider.getResolver() is effectively EnsResolver.fromName()
EnsResolver.fromNameOld = EnsResolver.fromName;
//const { fromName } = EnsResolver;
EnsResolver.fromName = async function (provider, name) {
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
	} catch (err) {
		return null;
	}
};

const { resolveName, lookupAddress } = AbstractProvider.prototype;

AbstractProvider.prototype.resolveName = async function (
	name,
	coinType: BigNumberish = COIN_TYPE_ETH
) {
	if (coinType === "old") return resolveName.call(this, name);
	coinType = getBigInt(coinType, "coinType");
	const fwd = await this.getResolver(name);
	if (!fwd) return null;
	try {
		const a = await fetchAddress(fwd, coinType);
		if (!/^0x0+$/.test(a)) return a;
	} catch {}
	return null;
};

AbstractProvider.prototype.lookupAddress = async function (
	address,
	coinType: BigNumberish = COIN_TYPE_ETH
) {
	if (coinType === "old") return lookupAddress.call(this, address);
	assertArgument(
		isHexString(address) && address !== "0x",
		"invalid address",
		"address",
		address
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
						() => {}
					);
					if (checked) {
						assert(
							address === checked,
							"address->name->address mismatch",
							"BAD_DATA",
							{ value: [address, checked] }
						);
						return name;
					}
				}
			}
		}
		return null;
	} catch (error) {
		if (isError(error, "BAD_DATA") && error.value === "0x") {
			return null;
		}
		if (isError(error, "CALL_EXCEPTION")) {
			return null;
		}
		throw error;
	}
};

async function fetchAddress(resolver: EnsResolver, coinType: bigint) {
	if (coinType === COIN_TYPE_ETH) {
		return callResolver<string>(resolver, "addr(bytes32)");
	}
	const a = await callResolver<string>(
		resolver,
		"addr(bytes32,uint256)",
		coinType
	);
	return isEVMCoinType(coinType)
		? a === "0x"
			? a.padEnd(42)
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
				{ enableCcipRead: true }
			)
		);
		return f.outputs.length === 1 ? res[0] : res;
	} else {
		return r[f.format()](namehash(resolver.name), ...args, {
			enableCcipRead: true,
		});
	}
}
