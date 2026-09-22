export async function sxyprn(): Promise<unknown> {
  const module = await import('./index.js');
  return module;
}
export default sxyprn;
