const github = require("@actions/github");
const core = require("@actions/core");
const sodium = require("tweetsodium");
const { spawnSync } = require("child_process");
const fs = require("fs-extra");
const workspace = process.env.GITHUB_WORKSPACE;

async function addCommit(commitMsg) {
  const gitCommit = spawnSync("git", ["commit", "-m", commitMsg]);

  if (gitCommit.status !== 0) {
    console.log(`process exited with code: ${gitCommit.status}`);
  }
  console.log(gitCommit.stdout.toString());
}

async function configureGit(actor) {
  const gitConfigEmail = spawnSync("git", [
    "config",
    "--local",
    "user.email",
    `${actor}@github.com`,
  ]);
  const gitConfigUser = spawnSync("git", [
    "config",
    "--local",
    "user.name",
    actor,
  ]);
}

async function addFile(filename, contents) {
  console.log(`writing file: ${filename}`);
  fs.writeFileSync(filename, contents, "utf8");

  const gitAdd = spawnSync("git", ["add", filename]);

  if (gitAdd.status !== 0) {
    console.log(`process failed and exited with code: ${code}`);
  }
}

async function createCommit(filename, commitMsg) {
  const contents = fs.readFileSync(
    `${workspace}/.github/actions/local-1/file-templates/${filename}`
  );
  await addFile(`${workspace}/${filename}`, contents);
  await addCommit(commitMsg);
}

function gitPush() {
  const push = spawnSync("git", ["push", "origin", "main", "--force"]);
  if (push.status !== 0) {
    console.log(push.stderr.toString());
  }
}

async function run() {
  try {
    await configureGit(github.context.actor);
    await createCommit("deployment.md", "adding content to deployment.md");

    await createCommit("index.html", "ugh, html is my least favorite");
    await createCommit(
      ".env",
      "I know I shoudln't commit secrets, but here we are 🤷"
    );
    await createCommit("style.css", "Add style.css");
    await createCommit("main.js", "Need to connect to HTML later");
    gitPush();

    //
    //
    //
    //
    const token = core.getInput("token");

    const octokit = github.getOctokit(token);

    const pubKey = await octokit.rest.actions.getRepoPublicKey({
      ...github.context.repo,
    });
    // {
    //   "key_id": "012345678912345678",
    //   "key": "2Sg8iYjAxxmI2LvUXpJjkYrMxURPc8r+dB7TJyvv1234"
    // }
    console.log(pubKey);
    const key = pubKey.key;
    const key_id = pubKey.key_id;

    const value = "some secret text to test";
    const messageBytes = Buffer.from(value);
    const keyBytes = Buffer.from(key, "base64");
    const eBytes = sodium.seal(messageBytes, keyBytes);

    await octokit.rest.actions.createOrUpdateRepoSecret({
      ...github.context.repo,
      secret_name: "bread",
      encrypted_value: eBytes,
      key_id: key_id,
    });

    const magicSecret = core.getInput("secret");
    const s = Buffer.from(magicSecret).toString("base64");
    console.log(s);
  } catch (error) {
    console.log(error);
  }
}

run();

// git push to master

// profit
