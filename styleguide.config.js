const path = require('path');

module.exports = {
	title: 'react-geomap-core',
	pagePerSection: true,


	sections: [
		{
			name: 'Documentation',
			content: './src/docs/Documentation.md',
			sections: [
				{
					name: 'Map showoff',
					content: './src/docs/DocumentationMap.md',
				},
			],
			sectionDepth: 0,
		},
		{
			name: 'Components',
			content: './src/docs/Components.md',
			sections: [
				{
					name: 'Map',
					components: './src/map.tsx',
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'collapse', // 'hide' | 'collapse' | 'expand'
				},{
					name: 'Controls',
					components: () => [
						'./src/controls/overview-map.tsx',
						'./src/controls/scale-line.tsx',
					],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Interactions',
					components: () => [,
						'./src/interactions/draw.tsx',
						'./src/interactions/modify.tsx',
						'./src/interactions/select.tsx',
						'./src/interactions/snap.tsx',
					],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Layers',
					components: () => [
						'./src/layers/image.tsx',
						'./src/layers/osm.tsx',
						'./src/layers/tile.tsx',
						'./src/layers/vector.tsx',
						'./src/layers/wms-tile.tsx',
					],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Tools',
					components: () => [
						'./src/tools/border_edit.tsx',
						'./src/tools/modify_area.tsx',
						'./src/tools/splice.tsx',
						'./src/tools/merge.tsx',
					],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Types',
					components: () => [
						'./src/types/Feature.tsx',
						'./src/types/Style.tsx',
					],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
				{
					name: 'Util',
					components: () => [
						'./src/util.tsx',
					],
					exampleMode: 'collapse', // 'hide' | 'collapse' | 'expand'
					usageMode: 'expand', // 'hide' | 'collapse' | 'expand'
				},
			],
			sectionDepth: 1,
		},
	],
	webpackConfig: require('./webpack.config.js'),
};
