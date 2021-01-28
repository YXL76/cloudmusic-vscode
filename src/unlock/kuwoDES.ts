/*
	Thanks to
	https://github.com/XuShaohua/kwplayer/blob/master/kuwo/DES.py
	https://github.com/Levi233/MusicPlayer/blob/master/app/src/main/java/com/chenhao/musicplayer/utils/crypt/KuwoDES.java
*/

const range = (n: number) => Array.from(new Array(n).keys());
const power = (base: bigint, index: number) =>
  (Array(index).fill(undefined) as undefined[]).reduce(
    (result) => result * BigInt(base),
    BigInt(1)
  );
const longArray = (...array: number[]) => array.map((n) => BigInt(n));

// EXPANSION
const arrayE = longArray(
  // eslint-disable-next-line prettier/prettier
	31, 0, 1, 2, 3, 4, -1, -1, 3, 4, 5, 6, 7, 8, -1, -1, 7, 8, 9, 10, 11, 12, -1, -1,11, 12, 13, 14, 15, 16, -1, -1,15, 16, 17, 18, 19, 20, -1, -1,19, 20, 21, 22, 23, 24, -1, -1,23, 24, 25, 26, 27, 28, -1, -1,27, 28, 29, 30, 31, 30, -1, -1
);

// INITIAL_PERMUTATION
const arrayIP = longArray(
  // eslint-disable-next-line prettier/prettier
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7, 56, 48, 40, 32, 24, 16, 8, 0, 58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6
);

// INVERSE_PERMUTATION
const arrayIP1 = longArray(
  // eslint-disable-next-line prettier/prettier
	39, 7, 47, 15, 55, 23, 63, 31,38, 6, 46, 14, 54, 22, 62, 30,37, 5, 45, 13, 53, 21, 61, 29,36, 4, 44, 12, 52, 20, 60, 28,35, 3, 43, 11, 51, 19, 59, 27,34, 2, 42, 10, 50, 18, 58, 26,33, 1, 41, 9, 49, 17, 57, 25,32, 0, 40, 8, 48, 16, 56, 24
);

// ROTATES
const arrayLs = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const arrayLsMask = longArray(0, 0x100001, 0x300003);
const arrayMask = range(64).map((n) => power(BigInt(2), n));
arrayMask[arrayMask.length - 1] = arrayMask[arrayMask.length - 1] * BigInt(-1);

// PERMUTATION
const arrayP = longArray(
  // eslint-disable-next-line prettier/prettier
	15, 6, 19, 20, 28, 11, 27, 16, 0, 14, 22, 25, 4, 17, 30, 9, 1, 7, 23, 13, 31, 26, 2, 8,18, 12, 29, 5, 21, 10, 3, 24
);

// PERMUTED_CHOICE1
const arrayPC1 = longArray(
  // eslint-disable-next-line prettier/prettier
	56, 48, 40, 32, 24, 16, 8, 0,57, 49, 41, 33, 25, 17, 9, 1,58, 50, 42, 34, 26, 18, 10, 2,59, 51, 43, 35, 62, 54, 46, 38,30, 22, 14, 6, 61, 53, 45, 37,29, 21, 13, 5, 60, 52, 44, 36,28, 20, 12, 4, 27, 19, 11, 3
);

// PERMUTED_CHOICE2
const arrayPC2 = longArray(
  // eslint-disable-next-line prettier/prettier
	13, 16, 10, 23, 0, 4, -1, -1, 2, 27, 14, 5, 20, 9, -1, -1,22, 18, 11, 3, 25, 7, -1, -1,15, 6, 26, 19, 12, 1, -1, -1,40, 51, 30, 36, 46, 54, -1, -1,29, 39, 50, 44, 32, 47, -1, -1,43, 48, 38, 55, 33, 52, -1, -1,45, 41, 49, 35, 28, 31, -1, -1
);

const matrixNSBox = [
  // eslint-disable-next-line prettier/prettier
  [14, 4, 3, 15, 2, 13, 5, 3, 13, 14, 6, 9, 11, 2, 0, 5, 4, 1, 10, 12, 15, 6, 9, 10, 1, 8, 12, 7, 8, 11, 7, 0, 0, 15, 10, 5, 14, 4, 9, 10, 7, 8, 12, 3, 13, 1, 3, 6, 15, 12, 6, 11, 2, 9, 5, 0, 4, 2, 11, 14, 1, 7, 8, 13],
  // eslint-disable-next-line prettier/prettier
  [15, 0, 9, 5, 6, 10, 12, 9, 8, 7, 2, 12, 3, 13, 5, 2, 1, 14, 7, 8, 11, 4, 0, 3,14, 11, 13, 6, 4, 1, 10, 15, 3, 13, 12, 11, 15, 3, 6, 0, 4, 10, 1, 7, 8, 4, 11, 14,13, 8, 0, 6, 2, 15, 9, 5, 7, 1, 10, 12, 14, 2, 5, 9],
  // eslint-disable-next-line prettier/prettier
  [10, 13, 1, 11, 6, 8, 11, 5, 9, 4, 12, 2, 15, 3, 2, 14, 0, 6, 13, 1, 3, 15, 4, 10,14, 9, 7, 12, 5, 0, 8, 7,13, 1, 2, 4, 3, 6, 12, 11, 0, 13, 5, 14, 6, 8, 15, 2, 7, 10, 8, 15, 4, 9, 11, 5, 9, 0, 14, 3, 10, 7, 1, 12],
  // eslint-disable-next-line prettier/prettier
  [ 7, 10, 1, 15, 0, 12, 11, 5,14, 9, 8, 3, 9, 7, 4, 8,13, 6, 2, 1, 6, 11, 12, 2, 3, 0, 5, 14, 10, 13, 15, 4,13, 3, 4, 9, 6, 10, 1, 12,11, 0, 2, 5, 0, 13, 14, 2, 8, 15, 7, 4, 15, 1, 10, 7, 5, 6, 12, 11, 3, 8, 9, 14],
  // eslint-disable-next-line prettier/prettier
  [2, 4, 8, 15, 7, 10, 13, 6, 4, 1, 3, 12, 11, 7, 14, 0, 12, 2, 5, 9, 10, 13, 0, 3, 1, 11, 15, 5, 6, 8, 9, 14, 14, 11, 5, 6, 4, 1, 3, 10, 2, 12, 15, 0, 13, 2, 8, 5, 11, 8, 0, 15, 7, 14, 9, 4, 12, 7, 10, 9, 1, 13, 6, 3],
  // eslint-disable-next-line prettier/prettier
  [12, 9, 0, 7, 9, 2, 14, 1, 10, 15, 3, 4, 6, 12, 5, 11, 1, 14, 13, 0, 2, 8, 7, 13, 15, 5, 4, 10, 8, 3, 11, 6, 10, 4, 6, 11, 7, 9, 0, 6, 4, 2, 13, 1, 9, 15, 3, 8, 15, 3, 1, 14, 12, 5, 11, 0, 2, 12, 14, 7, 5, 10, 8, 13],
  // eslint-disable-next-line prettier/prettier
  [4, 1, 3, 10, 15, 12, 5, 0, 2, 11, 9, 6, 8, 7, 6, 9, 11, 4, 12, 15, 0, 3, 10, 5, 14, 13, 7, 8, 13, 14, 1, 2, 13, 6, 14, 9, 4, 1, 2, 14, 11, 13, 5, 0, 1, 10, 8, 3, 0, 11, 3, 5, 9, 4, 15, 2, 7, 8, 12, 15, 10, 7, 6, 12],
  // eslint-disable-next-line prettier/prettier
  [13, 7, 10, 0, 6, 9, 5, 15, 8, 4, 3, 10, 11, 14, 12, 5, 2, 11, 9, 6, 15, 12, 0, 3, 4, 1, 14, 13, 1, 2, 7, 8, 1, 2, 12, 15, 10, 4, 0, 3, 13, 14, 6, 9, 7, 8, 9, 6, 15, 1, 5, 12, 3, 10, 14, 5, 8, 7, 11, 0, 4, 13, 2, 11],
];

const bitTransform = (arrInt: bigint[], n: number, l: bigint) => {
  let l2 = BigInt(0);
  range(n).forEach((i) => {
    if (
      arrInt[i] < 0 ||
      (l & BigInt(arrayMask[Number(arrInt[i])])) === BigInt(0)
    )
      return;
    l2 = l2 | BigInt(arrayMask[i]);
  });
  return l2;
};

const DES64 = (longs: bigint[], l: bigint) => {
  const pR = range(8).map(() => 0);
  let out = bitTransform(arrayIP, 64, l);
  const pSource = [
    out & BigInt(0xffffffff),
    (out & BigInt(-4294967296)) >> BigInt(32),
  ];

  range(16).forEach((i) => {
    let R = pSource[1];
    R = bitTransform(arrayE, 64, R);
    R = R ^ longs[i];
    range(8).forEach((j) => {
      pR[j] = Number((R >> BigInt(j * 8)) & BigInt(255));
    });
    let sOut = BigInt(0);
    range(8)
      .reverse()
      .forEach((sbi) => {
        sOut = (sOut << BigInt(4)) | BigInt(matrixNSBox[sbi][pR[sbi]]);
      });
    R = bitTransform(arrayP, 32, sOut);
    const L = BigInt(pSource[0]);
    pSource[0] = BigInt(pSource[1]);
    pSource[1] = L ^ R;
  });
  pSource.reverse();
  out =
    ((pSource[1] << BigInt(32)) & BigInt(-4294967296)) |
    (pSource[0] & BigInt(0xffffffff));
  return bitTransform(arrayIP1, 64, out);
};

const subKeys = (l: bigint, longs: bigint[]) => {
  // long, long[], int
  let l2 = bitTransform(arrayPC1, 56, l);
  range(16).forEach((i) => {
    l2 =
      ((l2 & BigInt(arrayLsMask[arrayLs[i]])) << BigInt(28 - arrayLs[i])) |
      ((l2 & BigInt(~arrayLsMask[arrayLs[i]])) >> BigInt(arrayLs[i]));
    longs[i] = bitTransform(arrayPC2, 64, l2);
  });
};

const crypt = (msg: Buffer, key: Buffer) => {
  // 处理密钥块
  let l = BigInt(0);
  range(8).forEach((i) => {
    l = (BigInt(key[i]) << BigInt(i * 8)) | l;
  });

  const j = Math.floor(msg.length / 8);
  // arrLong1 存放的是转换后的密钥块, 在解密时只需要把这个密钥块反转就行了

  const arrLong1 = range(16).map(() => BigInt(0));
  subKeys(l, arrLong1);

  // arrLong2 存放的是前部分的明文
  const arrLong2 = range(j).map(() => BigInt(0));

  range(j).forEach((m) => {
    range(8).forEach((n) => {
      arrLong2[m] = (BigInt(msg[n + m * 8]) << BigInt(n * 8)) | arrLong2[m];
    });
  });

  // 用于存放密文
  const arrLong3 = range(Math.floor((1 + 8 * (j + 1)) / 8)).map(() =>
    BigInt(0)
  );

  // 计算前部的数据块(除了最后一部分)
  range(j).forEach((i1) => {
    arrLong3[i1] = DES64(arrLong1, arrLong2[i1]);
  });

  // 保存多出来的字节
  const arrByte1 = msg.slice(j * 8);
  let l2 = BigInt(0);

  range(msg.length % 8).forEach((i1) => {
    l2 = (BigInt(arrByte1[i1]) << BigInt(i1 * 8)) | l2;
  });

  // 计算多出的那一位(最后一位)
  arrLong3[j] = DES64(arrLong1, l2); // 解密不需要

  // 将密文转为字节型
  const arrByte2 = range(8 * arrLong3.length).map(() => 0);
  let i4 = 0;
  arrLong3.forEach((l3) => {
    range(8).forEach((i6) => {
      arrByte2[i4] = Number((l3 >> BigInt(i6 * 8)) & BigInt(255));
      i4 += 1;
    });
  });
  return Buffer.from(arrByte2);
};

const SECRET_KEY = Buffer.from("ylzsxkwm");
export default function encrypt(query: string) {
  return crypt(Buffer.from(query), SECRET_KEY).toString("base64");
}
