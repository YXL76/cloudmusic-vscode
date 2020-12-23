declare module "array-unsort" {
  export function unsortInplace<T>(items: T[]): T[];
}

declare module "cacache" {
  export interface CacheObject {
    integrity: string;
    key: string;
    metadata?: any;
    path: string;
    time: number;
    size: number;
  }

  export interface GetCacheObject {
    metadata?: any;
    integrity: string;
    data: Buffer;
    size: number;
  }

  export namespace get {
    interface HasContentObject {
      size: number;
      sri: {
        algorithm: string;
        digest: string;
        options: any[];
        source: string;
      };
    }

    interface Options {
      integrity?: string;
      memoize?: boolean;
      size?: number;
    }

    namespace copy {
      function byDigest(
        cachePath: string,
        hash: string,
        dest: string,
        opts?: Options
      ): Promise<string>;
    }

    namespace stream {
      function byDigest(
        cachePath: string,
        hash: string,
        opts?: Options
      ): NodeJS.ReadableStream;
    }

    function byDigest(
      cachePath: string,
      hash: string,
      opts?: Options
    ): Promise<string>;
    function copy(
      cachePath: string,
      key: string,
      dest: string,
      opts?: Options
    ): Promise<CacheObject>;

    function hasContent(
      cachePath: string,
      hash: string
    ): Promise<HasContentObject | false>;
    function hasContentnc(
      cachePath: string,
      hash: string
    ): HasContentObject | false;

    function info(cachePath: string, key: string): Promise<CacheObject>;

    function stream(
      cachePath: string,
      key: string,
      opts?: Options
    ): NodeJS.ReadableStream;
    function sync(cachePath: string, key: string, opts?: Options): CacheObject;
    function syncDigest(
      cachePath: string,
      key: string,
      opts?: Options
    ): CacheObject;
  }

  export namespace ls {
    type Cache = Record<string, CacheObject & { size: number }>;

    function stream(cachePath: string): NodeJS.ReadableStream;
  }

  export namespace put {
    interface Options {
      algorithms?: string[];

      integrity?: string;

      metadata?: any;

      memoize?: null | boolean;

      size?: number;
    }

    function stream(
      cachePath: string,
      key: string,
      opts?: Options
    ): NodeJS.WritableStream;
  }

  export namespace rm {
    function all(cachePath: string): Promise<void>;

    function entry(cachePath: string, key: string): Promise<CacheObject>;

    function content(cachePath: string, hash: string): Promise<boolean>;
  }

  export namespace tmp {
    type Callback = (dir: string) => void;
    interface Options {
      tmpPrefix?: string;
    }

    function fix(cachePath: string): Promise<void>;

    function mkdir(cachePath: string, opts?: Options): Promise<string>;

    function withTmp(cachePath: string, opts: Options, cb: Callback): void;
    function withTmp(cachePath: string, cb: Callback): void;
  }

  export namespace verify {
    interface Options {
      filter: false | string;
    }

    function lastRun(cachePath: string): Promise<Date>;
  }

  export function clearMemoized(): Record<string, CacheObject>;

  export function get(
    cachePath: string,
    key: string,
    options?: get.Options
  ): Promise<GetCacheObject>;

  export function ls(cachePath: string): Promise<ls.Cache>;

  export function put(
    cachePath: string,
    key: string,
    data: any,
    opts?: put.Options
  ): Promise<string>;

  export function rm(cachePath: string, key: string): Promise<any>;

  export function setLocale(locale: string): any;

  export function verify(
    cachePath: string,
    opts?: verify.Options
  ): Promise<any>;
}
