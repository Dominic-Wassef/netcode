import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localForage from 'localforage';

const fileCache = localForage.createInstance({
  name: 'filecache',
});

export const fetchPlugin = (inputCode: string) => {
    return {
      name: 'fetched-plugin',
      setup(build: esbuild.PluginBuild) {
				build.onLoad({ filter: /(^index\.js$)/ }, () => {
					return {
						loader: 'jsx',
						contents: inputCode,
					};
				});

			build.onLoad({ filter: /.*/ }, async (args: any) => {
				const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(args.path);
    
				if (cachedResult) {
					return cachedResult;
				}
			})

				build.onLoad({ filter: /.css$/ }, async (args:any) => {
          const { data, request } = await axios.get(args.path);
					const espaced = data
					.replace(/\n/g, '')
					.replace(/"/g, '\\"')
					.replace(/'/g, "\\'");
					const contents =
					`const style = document.createElement('style');
						style.innerText = '${espaced}';
						document.head.appendChild(style);`;

          const result: esbuild.OnLoadResult = {
            loader: 'jsx',
            contents,
            resolveDir: new URL('./', request.responseURL).pathname,
          };
    
          // Store response in cache
          await fileCache.setItem(args.path, result);
    
          return result;				
				})

      	build.onLoad({ filter: /.*/ }, async (args: any) => {  
          const { data, request } = await axios.get(args.path);
          const result: esbuild.OnLoadResult = {
            loader: 'jsx',
            contents: data,
            resolveDir: new URL('./', request.responseURL).pathname,
          };
    
          // Store response in cache
          await fileCache.setItem(args.path, result);
    
          return result;
      });
    }
  }
}