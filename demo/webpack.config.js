/**
 * This config is to build demo/app.js to show examples
 * to github users
 */
var path = require('path');
const webpack = require('webpack');

const config = {
	entry: './demo/index.tsx',
	output: {
		path: `${__dirname}/build/`,
		publicPath: '/build/',
		filename: 'app.js'
	},
	devtool: 'source-map',
	resolve: {
		extensions: ['.ts', '.webpack.js', '.js', '.tsx', '.json', '.css', '.html'],
		alias: {
			'react-openlayers': path.join(__dirname, '..', 'src', 'index'),
			'openlayers': 'openlayers/dist/ol-debug.js',

		}
	},
	module: {
		rules: [
			{test: /\.ts$/, use: 'ts-loader'},
			{
				test: /\.css$/,
				use: [
					{loader: "style-loader"},
					{loader: "css-loader"},
				],
			},
			{test: /\.html/, use: 'html-loader'},
			{test: /\.tsx?$/, use: 'ts-loader'}
		]
	},
	plugins: []
};

module.exports = config;
