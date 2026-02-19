export const getChainConfig = (chainId: number) => {
  switch (chainId) {
    case 369:
      return {
        routerAddress: "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52" as `0x${string}`,
        // routerAddress:
        //   "0xea73e1dEbC70770520A68Aa393C1d072a529bea9" as `0x${string}`,
        wethAddress:
          "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as `0x${string}`,
      };
    case 10001:
      return {
        routerAddress:
          "0x4bF29b3D063BE84a8206fb65050DA3E21239Ff12" as `0x${string}`,
        wethAddress:
          "0x7Bf88d2c0e32dE92CdaF2D43CcDc23e8Edfd5990" as `0x${string}`,
      };
    case 146:
      return {
        routerAddress:
          "0xd8016e376e15b20Fc321a37fD69DC42cfDf951Bb" as `0x${string}`,
        wethAddress:
          "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38" as `0x${string}`,
      };
    case 8453:
      return {
        routerAddress: "0xB12b7C117434B58B7623f994F4D0b4af7BC0Ac37" as `0x${string}`,
        wethAddress:
          "0x4200000000000000000000000000000000000006" as `0x${string}`,
      };
    case 1329:
      return {
        routerAddress:
          "0xb0e99628d884b3f45a312BCFD7A2505Cd711b657" as `0x${string}`,
        wethAddress:
          "0xe30fedd158a2e3b13e9badaeabafc5516e95e8c7" as `0x${string}`,
      };
    case 80094:
      return {
        routerAddress:
          "0x365Ac3b1aB01e34339E3Ff1d94934bFEcB7933e0" as `0x${string}`,
        wethAddress: 
          "0x6969696969696969696969696969696969696969" as `0x${string}`,
      };
    case 30:
      return {
        routerAddress:
          "0x1fb42f76f101f8eb2ed7a12ac16b028500907f80" as `0x${string}`,
        wethAddress:
          "0x542fda317318ebf1d3deaf76e0b632741a7e677d" as `0x${string}`,
      };
    default:
      throw new Error(`Chain ${chainId} not supported`);
  }
};