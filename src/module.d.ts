declare module "NeteaseCloudMusicApi/util/index" {
  export function cookieToJson(cookie: string): Record<string, unknown>;
}

declare module "array-unsort" {
  export function unsortInplace<T>(items: T[]): T[];
}

declare module "cacahe" {
  export interface CacheObject {
    integrity: string;
    key: string;
    metadata?: any;
    path: string;
    time: number;
    size: number;
  }
}
