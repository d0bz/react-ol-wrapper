module.exports = {
	testEnvironment: 'jsdom',
	"roots": [
		"<rootDir>/src"
	],
	"transform": {
		"^.+\\.tsx?$": "ts-jest"
	},
	"testRegex": "(<rootDir>/test/.*|(\\.|/)(test|spec))\\.tsx?$",
	"moduleFileExtensions": [
		"ts",
		"tsx",
		"js",
		"jsx",
		"json",
		"node"
	],
	"moduleNameMapper": {
		'openlayers': '<rootDir>/node_modules/openlayers/dist/ol-debug.js',
	}
};