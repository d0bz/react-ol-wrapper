var path = require("path");
var webpack = require('webpack');
const {CheckerPlugin} = require('awesome-typescript-loader');


var config = {
    entry: './src/index.tsx',
    output: {
        path: path.join(__dirname, 'build'),
        filename: "index.js",
        library: ["react-ol"],
        libraryTarget: "commonjs2"
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json', '.css', '.html'],
        alias: {
            'jsts': 'jsts/dist/jsts.min.js'
        },
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {loader: "style-loader"},
                    {loader: "css-loader"},
                ],
            },
            {test: /\.html/, use: 'html-loader'},
            {test: /\.ts$/, use: 'awesome-typescript-loader'},
            {test: /\.tsx?$/, use: 'awesome-typescript-loader'}
        ]
    },
    externals: {
        'react': 'commonjs react' // this line is just to use the React dependency of our parent-testing-project instead of using our own React.
    },
    plugins: [
        new CheckerPlugin()
    ]
};

module.exports = config;
