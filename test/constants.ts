export const RPC_URL = "https://eth.drpc.org";

export const BATCH_GATEWAYS = ["https://ccip-v3.ens.xyz"];

export function isTrustedURL(url: string) {
    return url === RPC_URL || BATCH_GATEWAYS.includes(url);
}

// name that exists
export const NAME = "raffy.eth";
export const ADDR = "0x51050ec063d393217B436747617aD1C2285Aeeee";

export const NAME_TUNNEL = "raffy.base.eth"; // name that uses ccip-read

export const NAME_ZERO = "zero.raffy.eth"; // no addresses defined

export const NAME_DNE = "__dne"; // name w/o forward
export const ADDR_DNE = "0x00000000000000000000000000000000DeaDBeef"; // address w/o reverse

export const NAME_UNNORM = "unnorm_"; // name that doesn't normalize

export const NAME_UNSET = "tog.raffy.eth"; // name w/o addr(60)
