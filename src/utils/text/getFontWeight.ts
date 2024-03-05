function getFontWeight(fontWeight){
  const inputFontWeight = fontWeight.toLowerCase().replaceAll(/[-_.]/gi,"");  
  const weights = {
    100 : ["thin", "hairline", "100"],
    200 : ["extralight","ultralight", "200"],
    300 : ["light", "300"],
    400 : ["normal", "regular", "book", "400"],
    500 : ["medium", "500"],
    600 : ["semibold", "demibold", "600"],
    700 : ["bold", "700"],
    800 : ["ultrabold", "extrabold", "800"],
    900 : ["black", "heavy", "900"],
    950 : ["extrablack", "ultrablack", "950"]
  }
  return Object.keys(weights).find(weight => weights[weight].includes(inputFontWeight)) || 400;
}
