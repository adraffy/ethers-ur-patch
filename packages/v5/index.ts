import {
	BigNumber,
	Contract,
	utils,
	providers,
	type BigNumberish,
} from "ethers";
import {
	getAddress,
	hexlify,
	id as labelhash,
	Interface,
	isHexString,
	keccak256,
	Logger,
	toUtf8Bytes,
} from "ethers/lib/utils";
import {
	ABI_FRAGMENTS,
	COIN_TYPE_ETH,
	getReverseName,
	isEVMCoinType,
	UR_PROXY,
} from "../../src/shared.js";
import { ens_normalize } from "@adraffy/ens-normalize";

export * from "ethers";

declare module "ethers/lib/utils" {
	function ensNormalize(name: string): string;
}

declare module "@ethersproject/providers" {
	interface BaseProvider {
		getResolverOld(name: string): Promise<providers.Resolver | null>;
		resolveName(
			name: string | Promise<string>,
			coinType?: BigNumberish
		): Promise<string | null>;
		lookupAddress(
			address: string | Promise<string>,
			coinType?: BigNumberish
		): Promise<string | null>;
	}
}

// capture address logger
let logger = new Logger("ur-patch");
{
	const { makeError } = Logger.prototype;
	Logger.prototype.makeError = function () {
		logger = this;
		throw 1;
	};
	try {
		utils.getAddress("abc");
	} catch {}
	Logger.prototype.makeError = makeError;
}

const ABI = new Interface(ABI_FRAGMENTS);

Object.defineProperties(utils, {
	dnsEncode: { value: dnsEncode },
	namehash: { value: namehash },
	ensNormalize: { value: ens_normalize },
});

const { getResolver, resolveName, lookupAddress } =
	providers.BaseProvider.prototype;

providers.BaseProvider.prototype.getResolverOld = getResolver;
providers.BaseProvider.prototype.getResolver = async function (name) {
	const UR = new Contract(UR_PROXY, ABI, this);
	try {
		name = ens_normalize(name);
		const result = await UR.requireResolver(dnsEncode(name));
		const resolver = new providers.Resolver(this, result.resolver, name);
		resolver._supportsEip2544 = Promise.resolve(result.extended);
		return resolver;
	} catch (err) {
		return null;
	}
};

providers.BaseProvider.prototype.resolveName = async function (
	name,
	coinType: BigNumberish = COIN_TYPE_ETH
) {
	if (coinType === "old") return resolveName.call(this, name);
	name = await name;
	coinType = BigNumber.from(coinType).toBigInt();
	if (isHexString(name) && name.length === 42) {
		return getAddress(name); // weird
	}
	const fwd = await this.getResolver(name);
	if (!fwd) return null;
	try {
		const a = await fetchAddress(fwd, coinType);
		if (!/^0x0+$/.test(a)) return a;
	} catch {}
	return null;
};

providers.BaseProvider.prototype.lookupAddress = async function (
	address,
	coinType: BigNumberish = COIN_TYPE_ETH
) {
	if (coinType === "old") return lookupAddress.call(this, address);
	address = await address;
	if (!isHexString(address) || address === "0x") {
		logger.throwArgumentError("invalid address", "address", address);
	}
	address = address.toLowerCase();
	coinType = BigNumber.from(coinType).toBigInt();
	const reverseName = getReverseName(address, coinType);
	try {
		const rev = await this.getResolver(reverseName);
		if (rev) {
			const name = await callResolver<string>(rev, "name");
			if (name && ens_normalize(name) === name) {
				const fwd = await this.getResolver(name);
				if (fwd) {
					const checked = await fetchAddress(fwd, coinType);
					if (address === checked.toLowerCase()) {
						return name;
					}
				}
			}
		}
	} catch {}
	return null;
};

function namesplit(name: string) {
	return name ? name.split(".") : [];
}

// the original function is bad since it throws above 63 characters
function dnsEncode(name: string) {
	const m = namesplit(name).map((x) => toUtf8Bytes(x));
	const v = new Uint8Array(m.reduce((a, x) => a + 1 + x.length, 1));
	let pos = 0;
	for (const x of m) {
		if (x.length > 255) {
			throw new Error("invalid DNS encoded entry; length exceeds 255 bytes");
		}
		v[pos++] = x.length;
		v.set(x, pos);
		pos += x.length;
	}
	return hexlify(v);
}

function namehash(name: string) {
	return namesplit(name).reduceRight(
		(h, x) => keccak256(h + labelhash(x).slice(2)),
		"0x".padEnd(66, "0")
	);
}

async function fetchAddress(resolver: providers.Resolver, coinType: bigint) {
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
	resolver: providers.Resolver,
	fragment: string,
	...args: any[]
): Promise<T> {
	const f = ABI.getFunction(fragment)!;
	const r = new Contract(resolver.address, ABI, resolver.provider);
	const node = namehash(resolver.name);
	if (await resolver.supportsWildcard()) {
		const res: any = ABI.decodeFunctionResult(
			f,
			await r.resolve(
				dnsEncode(resolver.name),
				ABI.encodeFunctionData(f, [node, ...args]),
				{ ccipReadEnabled: true }
			)
		);
		return f.outputs?.length === 1 ? res[0] : res;
	} else {
		return r[f.format()](node, ...args, { ccipReadEnabled: true });
	}
}
