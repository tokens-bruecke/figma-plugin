export const getFontWeight = (fontWeight: string) => {
  const inputFontWeight = fontWeight.toLowerCase();

  const weights = {
    100 : ["thin", "hairline", "100"],
    200 : ["extra-light", "extraLight", "ultra-light", "ultraLight", "200"],
    300 : ["light", "300"],
    400 : ["normal", "regular", "book", "400"],
    500 : ["medium", "500"],
    600 : ["semi-bold", "semiBold", "demi-bold", "demiBold", "600"],
    700 : ["bold", "700"],
    800 : ["ultra-bold", "ultraBold", "extra-bold", "extraBold", "800"],
    900 : ["black", "heavy", "900"],
    950 : ["extra-black", "ultra-black", "extraBlack", "ultraBlack", "950"]
  }
  return Number(Object.keys(weights).find(weight => weights[weight].includes(inputFontWeight))) || 400;
};
