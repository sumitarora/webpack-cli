const fs = require('fs');
const chalk = require('chalk');
const diff = require('diff');
const inquirer = require('inquirer');
const PLazy = require('p-lazy');
const Listr = require('listr');

module.exports = function transformFile(currentConfigPath, outputConfigPath, options) {
	const recastOptions = Object.assign({
		quote: 'single'
	}, options);
	const tasks = new Listr([
		{
			title: 'Reading webpack config',
			task: (ctx) => new PLazy((resolve, reject) => {
				fs.readFile(currentConfigPath, 'utf8', (err, content) => {
					if (err) {
						reject(err);
					}
					try {
						const jscodeshift = require('jscodeshift');
						ctx.source = content;
						ctx.ast = jscodeshift(content);
						resolve();
					} catch (err) {
						reject('Error generating AST', err);
					}
				});
			})
		},
		{
			title: 'Migrating config from v1 to v2',
			task: (ctx) => {
				const transformations = require('./transformations').transformations;
				return new Listr(Object.keys(transformations).map(key => {
					const transform = transformations[key];
					return {
						title: key,
						task: () => transform(ctx.ast, ctx.source)
					};
				}));
			}
		}
	]);

	tasks.run()
		.then((ctx) => {
			const result = ctx.ast.toSource(recastOptions);
			const diffOutput = diff.diffLines(ctx.source, result);
			diffOutput.forEach(diffLine => {
				if (diffLine.added) {
					process.stdout.write(chalk.green(`+ ${diffLine.value}`));
				} else if (diffLine.removed) {
					process.stdout.write(chalk.red(`- ${diffLine.value}`));
				}
			});
			inquirer
				.prompt([
					{
						type: 'confirm',
						name: 'confirmMigration',
						message: 'Are you sure these changes are fine?',
						default: 'Y'
					}
				])
				.then(answers => {
					if (answers['confirmMigration']) {
						// TODO validate the config
						fs.writeFileSync(outputConfigPath, result, 'utf8');
						console.log(chalk.green(`✔︎ New webpack v2 config file is at ${outputConfigPath}`));
					} else {
						console.log(chalk.red('✖ Migration aborted'));
					}
				});
		})
		.catch(err => {
			console.log(chalk.red('✖ ︎Migration aborted due to some errors'));
			console.error(err);
			process.exitCode = 1;
		});
};
