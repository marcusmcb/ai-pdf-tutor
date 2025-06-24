// Minimal TypeScript type for pdf-text-extract
// Place this file in your project to provide type hints for the extract function

declare module "pdf-text-extract" {
  function extract(
    filePath: string,
    callback: (err: any, pages: string[]) => void
  ): void;
  export = extract;
}
