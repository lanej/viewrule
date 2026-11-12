import path from "node:path";
import {
  prepareCase,
  evaluateCase,
  verifyFixtures,
  serveCase,
} from "../benchmarks/workflow/status-acceptance/case.mjs";

const [command, destination, output, ...extra] = process.argv.slice(2);
const usage =
  "Usage: node scripts/status-acceptance.mjs verify-fixtures OUTPUT | prepare DESTINATION [--baseline] | evaluate DESTINATION OUTPUT | serve DESTINATION";
if (
  !destination ||
  extra.length ||
  !["verify-fixtures", "prepare", "evaluate", "serve"].includes(command) ||
  (command === "evaluate"
    ? !output
    : command === "prepare"
      ? output && output !== "--baseline"
      : output)
) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const directory = path.resolve(destination);
    if (command === "prepare")
      console.log(
        await prepareCase(directory, "starting", output !== "--baseline"),
      );
    else if (command === "verify-fixtures")
      console.log(JSON.stringify(await verifyFixtures(directory)));
    else if (command === "evaluate") {
      const result = await evaluateCase(directory, path.resolve(output));
      console.log(JSON.stringify(result));
      process.exitCode =
        result.execution === "completed" ? (result.accepted ? 0 : 1) : 2;
    } else {
      const server = await serveCase(path.join(directory, "app"));
      console.log(server.url);
      const close = async () => {
        await server.close();
      };
      process.once("SIGINT", close);
      process.once("SIGTERM", close);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
