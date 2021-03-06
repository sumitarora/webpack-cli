const npmPackagesExists = require('./utils/npm-packages-exists');
const creator = require('./creator/index');

/*
* @function initializeInquirer
*
* First function to be called after running the init flag. This is a check,
* if we are running the init command with no arguments or if we got dependencies
*
* @param { Object } pkg - packages included when running the init command
* @returns { <Function> } prompt|npmPackagesExists - returns either an inquirer prompt with
* the initial questions we provide, or validates the packages given
*/

module.exports = function initializeInquirer(pkg) {
	if(pkg.length == 0) {
		return creator();
	}
	return npmPackagesExists(pkg);
};
