export function toFraction(decimal: number): string {
  const whole = Math.floor(decimal);
  const remainder = decimal - whole;
  
  if (remainder === 0) {
    return whole.toString();
  }
  
  // Convert to sixteenths
  const sixteenths = Math.round(remainder * 16);
  
  if (sixteenths === 0) {
    return whole.toString();
  }
  
  if (sixteenths === 16) {
    return (whole + 1).toString();
  }
  
  // Simplify fraction
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(sixteenths, 16);
  const numerator = sixteenths / divisor;
  const denominator = 16 / divisor;
  
  const fractionPart = `${numerator}/${denominator}`;
  return whole > 0 ? `${whole} ${fractionPart}` : fractionPart;
}