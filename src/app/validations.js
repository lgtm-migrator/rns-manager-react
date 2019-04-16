import { isValidAddress, isValidChecksumAddress } from 'rskjs-util';

/**
 * validates rns names. e.g. wallet.alice.rsk is a valid name
 * @param {string} name to validate
 * @returns {bool} if the name is valid
 */
export const isValidName = name => {
  const labels = name.split('.');

  let isValid = true;

  labels.forEach(label => {
    if (label.length === 0) isValid = false;
  });

  return isValid;
};

/**
 * validate addresses according to rskip-60
 * https://github.com/rsksmart/RSKIPs/blob/master/IPs/RSKIP60.md
 * @param {address} address to validate
 * @param {number} chainId defined in erip-155
 * @returns {string} null if it's valid and an error message if it is not
 */
export const validateAddress = (address, chainId) => {
  if (!isValidAddress(address)) return 'Invalid address';
  if (!isValidChecksumAddress(address, chainId) && address !== address.toLowerCase()) return 'Invalid checksum';
  return null;
}
