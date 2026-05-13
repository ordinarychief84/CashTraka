/**
 * Local ambient module declaration for `tailwind-merge`.
 *
 * Why this file exists: the installed `tailwind-merge` package on this
 * project ships its CJS bundle but no `.d.ts` files (the `package.json`
 * `exports.types` field points at a non-existent `./dist/types.d.ts`).
 * That caused `tsc --noEmit` to fail to resolve the module even though
 * runtime works fine. This declaration unblocks the type-checker
 * without affecting runtime behaviour.
 *
 * Remove this stub once the upstream install bundles its types again.
 */
declare module 'tailwind-merge' {
  type ClassNameValue = string | undefined | null | false | ClassNameValue[];

  /**
   * Merge a list of Tailwind CSS classes, resolving conflicts so the
   * last conflicting class wins. Returns a single space-separated string.
   */
  export function twMerge(...classLists: ClassNameValue[]): string;

  export function twJoin(...classLists: ClassNameValue[]): string;
}
