/**
 * core/notImplemented.ts —— 未实现骨架的统一占位
 *
 * ★ 为什么不用 `export declare function`：
 *   `declare` 是**纯类型声明**，编译后运行时**不存在这个导出**。
 *   tsc 与 vite build 都能过，但任何 `import { foo }` 在运行时直接
 *   `SyntaxError: does not provide an export named 'foo'`。
 *   骨架阶段这会让"编译通过"给出虚假的安全感。
 *
 *   改成真函数抛错后：类型仍然完整（调用方按签名写代码即可），
 *   运行时也是**明确的失败**，且错误信息直接说明该在哪个 Milestone 补。
 */

export function notImplemented(what: string, milestone: string): never {
  throw new Error(`[Garden Match] ${what} 尚未实现（计划于 ${milestone}）。`);
}
