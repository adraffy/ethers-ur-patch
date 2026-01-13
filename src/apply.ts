// apply {name, version} to packages/*/package.json

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../");

const { name, version } = readPackage(join(root, "package.json"));

console.log({name, version});

for (const dir of readdirSync(join(root, "packages/"), {
	withFileTypes: true,
})) {
	if (!dir.isDirectory()) continue;
	const file = join(dir.parentPath, dir.name, "package.json");
	const json = readPackage(file);
	json.name = `${name}-${dir.name}`;
	json.version = version;
	writeFileSync(file, JSON.stringify(json, null, "\t"));
	console.log(`Wrote: ${dir.name}`);
}

function readPackage(file: string): {
	name: string;
	version: string;
} & Record<string, any> {
	return JSON.parse(readFileSync(file, "utf8"));
}
