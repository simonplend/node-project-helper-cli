import { resolve } from "node:path";

import minimist from "minimist";
import { fetch } from "undici";
import which from "which";
import { $, chalk, fs, question } from "zx";

export const moduleTypes = ["module", "commonjs"];

export function exitWithError(errorMessage) {
	console.error(chalk.red(errorMessage));
	process.exit(1);
}

/**
 * @see https://www.npmjs.com/package/minimist
 */
export async function optionsFromArgv(argv) {
	argv = minimist(argv, {
		string: ["dependencies"],
		boolean: [
			"git",
			"github",
			"public",
			"esm",
			"editorconfig",
			"prettier",
			"eslint",
			"lint-staged",
			"readme",
		],
		default: {
			git: false,
			github: false,
			public: false,
			esm: false,
			editorconfig: false,
			prettier: false,
			eslint: false,
			"lint-staged": false,
			readme: false,
		},
	});

	const projectName = argv._[0];
	if (!projectName) {
		throw new Error("You must specify the <project_name> argument");
	}

	const options = {
		projectName,
		git: argv.git,
		github: argv.github,
		public: argv.public,
		moduleType: argv.esm ? "module" : "commonjs",
		dependencies: argv.dependencies
			? packagesStringToArray(argv.dependencies)
			: [],
		editorconfig: argv.editorconfig,
		prettier: argv.prettier,
		eslint: argv.eslint,
		lintStaged: argv["lint-staged"],
		readme: argv.readme,
	};

	if (options.github && !options.git) {
		throw new Error(
			`Can't use --github flag without the --git flag.`
		);
	}

	if (options.public && !options.github) {
		throw new Error(
			`Can't use --public flag without the --github flag.`
		);
	}

	if (options.lintStaged) {
		if (!options.git || (!options.prettier && !options.eslint)) {
			throw new Error(
				`Can't use --lint-staged flag.\nRequires --git flag, and --prettier or --eslint flags, to be set.`
			);
		}
	}

	if (options.dependencies.length) {
		console.log(
			chalk.blue(
				`Checking packages in --dependencies exist... (${options.dependencies.join(
					", "
				)})`
			)
		);
		await verifyNpmPackagesExist(options.dependencies);
	}

	return options;
}

export async function checkRequiredProgramsExist(programs) {
	try {
		for (let program of programs) {
			await which(program);
		}
	} catch (error) {
		throw new Error(`Required program ${error.message}`);
	}
}

async function getGlobalGitSettingValue(settingName) {
	$.verbose = false;

	let settingValue = "";
	try {
		settingValue = (
			await $`git config --global --get ${settingName}`
		).stdout.trim();
	} catch (error) {
		// Ignore process output
	}

	$.verbose = true;

	return settingValue;
}

export async function checkGlobalGitSettings(settingsToCheck) {
	for (let settingName of settingsToCheck) {
		const settingValue = await getGlobalGitSettingValue(settingName);
		if (!settingValue) {
			console.warn(
				chalk.yellow(
					`Warning: Global git setting '${settingName}' is not set.`
				)
			);
		}
	}
}

export async function ensureProjectDirectory(projectDirectory) {
	projectDirectory = resolve(projectDirectory);

	if (!(await fs.pathExists(projectDirectory))) {
		await fs.ensureDir(projectDirectory);

		console.log(
			chalk.green(`Created project directory: ${projectDirectory}`)
		);
	}

	return projectDirectory;
}

/**
 * @see https://github.com/github/gitignore
 */
export async function generateGitIgnore() {
	const response = await fetch(
		"https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore"
	);
	const gitIgnoreContents = await response.text();

	await fs.writeFile(".gitignore", gitIgnoreContents);
}

function packagesStringToArray(packages) {
	return packages
		.trim()
		.split(" ")
		.filter((pkg) => pkg);
}

async function promptForPackages() {
	let packagesToInstall = await question(
		"Which npm packages do you want to install? "
	);

	packagesToInstall = packagesStringToArray(packagesToInstall);

	return packagesToInstall;
}

async function identifyInvalidNpmPackages(packages) {
	$.verbose = false;

	let invalidPackages = [];
	for (const pkg of packages) {
		try {
			await $`npm view ${pkg}`;
		} catch (error) {
			invalidPackages.push(pkg);
		}
	}

	$.verbose = true;

	return invalidPackages;
}

export async function verifyNpmPackagesExist(packages) {
	const invalidPackages = await identifyInvalidNpmPackages(packages);

	const allPackagesExist = invalidPackages.length === 0;
	if (!allPackagesExist) {
		throw new Error(
			`The following packages do not exist on npm: ${invalidPackages.join(
				", "
			)}`
		);
	}
}

export async function generateReadme({ projectDirectory, projectName }) {
	const readmeContents = `# ${projectName}

...
`;

	await fs.writeFile(`${projectDirectory}/README.md`, readmeContents);
}

export function displayCompletedMessage({ projectName }) {
	console.log(
		chalk.green(
			`\n✔️ The project '${projectName}' has been successfully bootstrapped!\n`
		)
	);
}
