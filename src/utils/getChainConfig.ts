export const getChainConfig = (chainId: number) => {
  switch (chainId) {
    case 369:
      return {
        // routerAddress: "0x0Cf6D948Cf09ac83a6bf40C7AD7b44657A9F2A52" as `0x${string}`,
        routerAddress:
          "0xea73e1dEbC70770520A68Aa393C1d072a529bea9" as `0x${string}`,
        wethAddress:
          "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as `0x${string}`,
      };
    case 10001:
      return {
        routerAddress:
          "0x4bf29b3d063be84a8206fb65050da3e21239ff12" as `0x${string}`,
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
    default:
      throw new Error(`Chain ${chainId} not supported`);
  }
};
