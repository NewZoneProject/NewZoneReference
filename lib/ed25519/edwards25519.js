// Edwards25519 point arithmetic (pure JS, BigInt)
// Extended coordinates (X:Y:Z:T)
// Curve: -x^2 + y^2 = 1 + d*x^2*y^2 over GF(2^255-19)

import { fAdd, fSub, fMul, fInv } from '../x25519/field25519.js';

// Prime p = 2^255 - 19
const P = (1n << 255n) - 19n;

// Edwards25519 constant d (RFC 8032)
export const EDWARDS_D = BigInt(
  "37095705934669439343138083508754565189542113879843219016388785533085940283555"
);

// Base point in extended coordinates
// RFC 8032 base point (affine):
// x = 15112221349535400772501151409588531511454012693041857206046113283949847762202
// y = 46316835694926478169428394003475163141307993866256225615783033603165251855960
const BASE_X = BigInt(
  "15112221349535400772501151409588531511454012693041857206046113283949847762202"
);
const BASE_Y = BigInt(
  "46316835694926478169428394003475163141307993866256225615783033603165251855960"
);

// Extended coordinates base point
export const BASE = {
  X: BASE_X,
  Y: BASE_Y,
  Z: 1n,
  T: fMul(BASE_X, BASE_Y)
};

// Neutral element (0,1) in extended coords
export const IDENTITY = {
  X: 0n,
  Y: 1n,
  Z: 1n,
  T: 0n
};

// Normalize to [0, p-1]
function norm(x) {
  x %= P;
  return x >= 0n ? x : x + P;
}

// Extended point addition
// A = (Y1 - X1)*(Y2 - X2)
// B = (Y1 + X1)*(Y2 + X2)
// C = T1 * 2d * T2
// D = Z1 * 2 * Z2
// E = B - A
// F = D - C
// G = D + C
// H = B + A
// X3 = E * F
// Y3 = G * H
// Z3 = F * G
// T3 = E * H
export function edAdd(Pt, Qt) {
  const X1 = norm(Pt.X), Y1 = norm(Pt.Y), Z1 = norm(Pt.Z), T1 = norm(Pt.T);
  const X2 = norm(Qt.X), Y2 = norm(Qt.Y), Z2 = norm(Qt.Z), T2 = norm(Qt.T);

  const Y1minusX1 = fSub(Y1, X1);
  const Y1plusX1  = fAdd(Y1, X1);
  const Y2minusX2 = fSub(Y2, X2);
  const Y2plusX2  = fAdd(Y2, X2);

  const A = fMul(Y1minusX1, Y2minusX2);
  const B = fMul(Y1plusX1,  Y2plusX2);
  const C = fMul(fMul(T1, T2), fMul(2n, EDWARDS_D));
  const D = fMul(fMul(Z1, Z2), 2n);

  const E = fSub(B, A);
  const F = fSub(D, C);
  const G = fAdd(D, C);
  const H = fAdd(B, A);

  const X3 = fMul(E, F);
  const Y3 = fMul(G, H);
  const Z3 = fMul(F, G);
  const T3 = fMul(E, H);

  return {
    X: norm(X3),
    Y: norm(Y3),
    Z: norm(Z3),
    T: norm(T3)
  };
}

// Point doubling (same formulas as addition with P=Q)
export function edDouble(Pt) {
  return edAdd(Pt, Pt);
}

// Scalar multiplication using double-and-add (LSB-first)
export function edScalarMult(scalar, Pt = BASE) {
  let k = scalar;
  let Q = { ...IDENTITY };
  let N = { ...Pt };

  for (let i = 0; i < 256; i++) {
    if ((k & 1n) === 1n) {
      Q = edAdd(Q, N);
    }
    N = edDouble(N);
    k >>= 1n;
    if (k === 0n) break;
  }

  return Q;
}

// Convert extended → affine (x,y)
export function toAffine(Pt) {
  const Zinv = fInv(Pt.Z);
  const x = fMul(Pt.X, Zinv);
  const y = fMul(Pt.Y, Zinv);
  return { x: norm(x), y: norm(y) };
}