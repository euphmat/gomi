import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const walletRule = html.match(/html\[data-number-notation="full"\] #header-wallet\s*\{([^}]+)\}/)?.[1] || '';
const balanceRule = html.match(/html\[data-number-notation="full"\] #header-gold,[\s\S]*?#header-prism\s*\{([^}]+)\}/)?.[1] || '';

if (!walletRule.includes('flex: 0 1 auto') || !walletRule.includes('width: fit-content')) {
  throw new Error('full-notation wallet must use its content width');
}
if (walletRule.includes('flex: 0 1 42vw')) {
  throw new Error('full-notation wallet must not reserve 42vw as its flex basis');
}
if (!balanceRule.includes('flex: 0 1 auto') || balanceRule.includes('flex: 1 1 0')) {
  throw new Error('Gold and Prism must not grow into equal-width header panels');
}
if (!balanceRule.includes('max-width: calc((42vw - 0.125rem) / 2)')) {
  throw new Error('Gold and Prism are missing the narrow-screen overflow cap');
}

console.log('Header number layout tests passed.');
