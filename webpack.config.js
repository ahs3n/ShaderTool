const path = require('path');

module.exports = {
    entry: {
        editor: './src/editor.js',
        index: './src/index.ts',

        'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
		'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
		'css.worker': 'monaco-editor/esm/vs/language/css/css.worker',
		'html.worker': 'monaco-editor/esm/vs/language/html/html.worker',
		'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: path.resolve(__dirname, '/dist/')
    },
    cache: {
        type: 'filesystem',
    },
    optimization: {
    },    
    module: {
        rules: [
            {
                test: /\.ts$/, // Handle .ts files
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
        ]
    },
    mode: 'development', // or 'production'
    devServer: {
        static: "."
    },
    devtool: 'eval-source-map', // For faster rebuilds
};
