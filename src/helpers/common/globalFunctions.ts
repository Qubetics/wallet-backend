const BigNumber = require('bignumber.js');

export const exponentialToDecimal = function (exponential: number | string) {
  let decimal: string = exponential.toString().toLowerCase();
  if (decimal.includes('e+')) {
    const exponentialSplitted: any = decimal.split('e+');
    let postfix: any = '';
    for (
      let i: number = 0;
      i <
      +exponentialSplitted[1] -
      (exponentialSplitted[0].includes('.')
        ? exponentialSplitted[0].split('.')[1].length
        : 0);
      i++
    ) {
      postfix += '0';
    }
    const addCommas: any = (text: string) => {
      let j: number = 3;
      let textLength: number = text.length;
      while (j < textLength) {
        text = `${text.slice(0, textLength - j)}${text.slice(
          textLength - j,
          textLength
        )}`;
        textLength++;
        j += 3 + 1;
      }
      return text;
    };
    decimal = addCommas(exponentialSplitted[0].replace('.', '') + postfix);
  }
  if (decimal.toLowerCase().includes('e-')) {
    const exponentialSplitted: any = decimal.split('e-');
    let prefix: any = '0.';
    for (let i = 0; i < +exponentialSplitted[1] - 1; i++) {
      prefix += '0';
    }
    decimal = prefix + exponentialSplitted[0].replace('.', '');
  }
  return decimal;
};

export const bigNumberSafeMath = function (
  c: string,
  operation: string,
  d: string | number,
  precision?: number
) {
  BigNumber.config({ DECIMAL_PLACES: 18 });
  var a = new BigNumber(c);
  var b = new BigNumber(typeof d === 'number' ? d.toString() : d);
  var rtn;
  // Figure out which operation to perform.
  switch (operation.toLowerCase()) {
    case '-':
      rtn = a.minus(b);
      break;
    case '+':
      rtn = a.plus(b);
      break;
    case '*':
    case 'x':
      rtn = a.multipliedBy(b);
      break;
    case '÷':
    case '/':
      rtn = a.dividedBy(b);
      break;
    default:
      break;
  }
  return rtn;
};


export const handleErrorMessage = async function (error: any) {
  try {
    let message = "Something went wrong";

    if (error !== undefined) {
      const errorMsg = typeof error === 'string' ? error
        : typeof error?.message === 'string' ? error.message
          : typeof error?.error === 'string' ? error.error
            : '';

      if (errorMsg.includes("Returned error: insufficient funds for gas * price + value")) {
        message = "Insufficient funds.";
      } else if (error?.response?.data?.errorCode === "TOKEN_NOT_TRADABLE") {
        message = "The specified token is not tradable.";
      } else if (errorMsg.includes("You have insufficient BSC balance to perform this transaction")) {
        message = "You have insufficient BSC balance to perform this transaction";
      } else if (errorMsg.includes("nonce has already been used")) {
        message = "Invalid nonce.";
      } else if (errorMsg.includes("transaction underpriced")) {
        message = "Transaction underpriced.";
      } else if (
        errorMsg.includes("replacement fee too low") ||
        errorMsg.includes("replacement transaction underpriced") ||
        error?.info?.error?.message?.includes("replacement transaction underpriced")
      ) {
        message = "Replacement transaction underpriced. Increase the gas fee and try again.";
      }else {
        message = "Something went wrong"
      }
      return message;
    }
  } catch (err: any) {
    console.log("handleErrorMessage")
    return "Something went wrong";
  }
}