// Montgomery ladder for Curve25519.

import { fAdd, fSub, fMul, fInv } from './field25519.js';

const ONE = 1n;
const ZERO = 0n;
const A24 = 121666n; // (A - 2) / 4, A = 486662

export function montgomeryLadder(scalar, u) {
  let x1 = u;
  let x2 = ONE;
  let z2 = ZERO;
  let x3 = x1;
  let z3 = ONE;
  let swap = 0n;

  for (let t = 254; t >= 0; t--) {
    const k_t = (scalar >> BigInt(t)) & 1n;
    const swapNew = swap ^ k_t;

    if (swapNew === 1n) {
      [x2, x3] = [x3, x2];
      [z2, z3] = [z3, z2];
    }
    swap = k_t;

    const A = fAdd(x2, z2);
    const AA = fMul(A, A);
    const B = fSub(x2, z2);
    const BB = fMul(B, B);
    const E = fSub(AA, BB);
    const C = fAdd(x3, z3);
    const D = fSub(x3, z3);
    const DA = fMul(D, A);
    const CB = fMul(C, B);
    const X3 = fMul(fAdd(DA, CB), fAdd(DA, CB));
    const Z3 = fMul(fSub(DA, CB), fSub(DA, CB));
    const X2 = fMul(AA, BB);
    const Z2 = fMul(E, fAdd(AA, fMul(A24, E)));

    x2 = X2;
    z2 = Z2;
    x3 = X3;
    z3 = Z3;
  }

  if (swap === 1n) {
    [x2, x3] = [x3, x2];
    [z2, z3] = [z3, z2];
  }

  const z2Inv = fInv(z2);
  return fMul(x2, z2Inv);
}