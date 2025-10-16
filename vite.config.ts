import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { codecovRollupPlugin } from "@codecov/rollup-plugin";

export default defineConfig({
	plugins: [
		sveltekit(),
		codecovRollupPlugin({
      enableBundleAnalysis: process.env.CODECOV_TOKEN !== undefined,
      bundleName: "networking-toolbox",
      uploadToken: process.env.CODECOV_TOKEN,
    }),
	],
  envPrefix: ['VITE_', 'PUBLIC_', 'NTB_'],
  define: {
    __DEPLOY_ENV__: JSON.stringify(process.env.DEPLOY_ENV || ''),
  },
});
