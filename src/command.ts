import multiline from 'multiline-ts';
import chalk from 'chalk';


import packageData from '../package.json';
import unlinted from './index';
import argvParser from './argvParser';
import reportResults from './reportResults';
import ProgressManager from './ProgressManager';
import { currentDate, exitProcess, getResultStats, ErrorWithFailures } from './util';

export const COMMAND_HELP = multiline`
  ${chalk.cyan('Project-wide linting and hygiene')}

    Usage: npx unlinted [<path>] [--help] [--config=<config-path>]
    Description:
      ${chalk.grey('Runs various checks on files in your git project.')}
      ${chalk.grey('Includes staged & unstaged files, excludes gitignored files.')}

    Arguments:
      <path>
      ${chalk.grey('Directory to run on, uses the Git project root if not specified')}

    Options:
      --config=<config-path>
        ${chalk.grey('A path to the the TS, JS or JSON config file.')}
        ${chalk.grey('The default value is "unlinted.config.ts" in the Git project root,')}
        ${chalk.grey('falls back to "unlinted.config.js", and then "unlinted.config.json"')}

      --help
      ${chalk.grey('Display this message')}

`;

/** Formats command errors */
export function formatCommandError(error: unknown): string {
  if (error instanceof ErrorWithFailures) {
    const messages = [`Error: ${error.message}`];
    for (const failure of error.failures) {
      messages.push(`> ${failure}`);
    }
    return messages.join('\n');
  } else if (error instanceof Error) {
    return `Error: ${error.message}`;
  } else {
    return `Error: ${String(error)}`;
  }
}

/** Run unlinted as a command */
export default async function command(
  argv: string[],
  deps = { log: console.log, currentDate, unlinted, reportResults, exitProcess },
) {
  const { args, options } = argvParser(argv);
  const startedAt = deps.currentDate();

  deps.log('');
  deps.log(chalk.inverse(chalk.bold.cyan(' unlinted ')) + chalk.cyan(' version ' + packageData.version));
  deps.log('');

  if (options.help) {
    deps.log(COMMAND_HELP);
    return;
  }

  if (options.config === true) {
    throw new Error('--config must have a value with the format: --config=value');
  }

  const results = await ProgressManager.manage(
    process.stdout,
    (progress) => deps.unlinted(progress, args.length > 0 ? args[0] : undefined, typeof options.config === 'string' ? options.config : undefined),
  );

  const stats = getResultStats(results);
  deps.reportResults(results, stats, startedAt);

  if (stats.files.failed > 0) {
    deps.exitProcess(1);
  }
}
