const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

type SxyprnApi = {
  videos: Record<string, (...arguments_: unknown[]) => unknown>;
  configure: (config: {
    minRequestIntervalMs?: number;
    proxyUrl?: string;
  }) => void;
};

const esmEntryUrl = pathToFileURL(join(__dirname, '../esm/index.js')).href;
let esmModulePromise: Promise<{ default: SxyprnApi }> | undefined;

const load = (): Promise<SxyprnApi> => {
  esmModulePromise ??= import(esmEntryUrl) as Promise<{
    default: SxyprnApi;
  }>;

  return esmModulePromise.then((module) => module.default);
};

const callVideoMethod = (methodName: string) => {
  return (...arguments_: unknown[]) => {
    return load().then((sxyprn) => {
      return sxyprn.videos[methodName](...arguments_);
    });
  };
};

const sxyprn = {
  videos: {
    blog: callVideoMethod('blog'),
    details: callVideoMethod('details'),
    home: callVideoMethod('home'),
    new: callVideoMethod('new'),
    orgasmic: callVideoMethod('orgasmic'),
    search: callVideoMethod('search'),
    tag: callVideoMethod('tag'),
    topPopular: callVideoMethod('topPopular'),
    topViewed: callVideoMethod('topViewed'),
  },

  configure: (config: unknown) => {
    return load().then((api) => {
      api.configure(
        config as { minRequestIntervalMs?: number; proxyUrl?: string },
      );
    });
  },
};

export = sxyprn;
