// Save / restore an exact demo run so it can be recorded again word for word.
//   npm run snapshot -- save <name>      copies .cache/muse (model responses) + .cache/runtime.json into snapshots/<name>/
//   npm run snapshot -- restore <name>   puts them back (adds the cached responses, replaces the demo state)
//   npm run snapshot -- list
// Why: responses are cached by exact input. If a prompt changes later, typing the same lines would make a fresh,
// different run. A snapshot keeps the run you liked.
import fs from "fs";
import path from "path";

const [cmd, name] = process.argv.slice(2);
const root = process.cwd();
const cacheDir = path.join(root, ".cache", "muse");
const runtime = path.join(root, ".cache", "runtime.json");
const snapDir = (n) => path.join(root, "snapshots", n);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(from)) {
    fs.copyFileSync(path.join(from, f), path.join(to, f));
    n++;
  }
  return n;
}

if (cmd === "save" && name) {
  const d = snapDir(name);
  const n = copyDir(cacheDir, path.join(d, "muse"));
  fs.copyFileSync(runtime, path.join(d, "runtime.json"));
  console.log(`saved snapshots/${name}: ${n} cached responses + demo state`);
} else if (cmd === "restore" && name) {
  const d = snapDir(name);
  if (!fs.existsSync(d)) throw new Error(`no snapshot ${name}`);
  const n = copyDir(path.join(d, "muse"), cacheDir);
  fs.copyFileSync(path.join(d, "runtime.json"), runtime);
  console.log(`restored snapshots/${name}: ${n} cached responses + demo state. Reload the page.`);
} else if (cmd === "list") {
  const dir = path.join(root, "snapshots");
  console.log(fs.existsSync(dir) ? fs.readdirSync(dir).join("\n") : "(none)");
} else {
  console.log("usage: npm run snapshot -- save|restore|list <name>");
}
